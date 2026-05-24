import React, { useEffect, useState } from "react";
import "./Auth.css";
import api from "../../services/api";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SmartArchiveLogo from "../../assets/SmartArchiveLogo.png";

export default function Auth() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationResult, _setVerificationResult] = useState(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [resendingCode, setResendingCode] = useState(false);
  const [showAuthUi, setShowAuthUi] = useState(false);

  const navigate = useNavigate();
  const { verifyEmail, loadUser, resendCode } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setShowAuthUi(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  const selectUpToTwoImages = (fileList) => {
    const imageFiles = Array.from(fileList || []).filter((candidate) =>
    candidate.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      setError("Please select image files only.");
      return;
    }

    if (imageFiles.length > 2) {
      setError("You can upload up to 2 images only.");
    } else {
      setError(null);
    }

    setFiles(imageFiles.slice(0, 2));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      selectUpToTwoImages(e.dataTransfer.files);
    }
  };



  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      selectUpToTwoImages(e.target.files);
    }
  };




  const handleUpload = async () => {
    if (!files.length) return;

    const formData = new FormData();

    formData.append("file", files[0]);

    let keepLoading = false;

    try {
      setLoading(true);
      setError(null);
      setStatusMessage("Checking CIN and account status...");

      const response = await api.post("/cin/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      const data = response.data;
      setResult(data);

      if (data.user_exists || data.admin_exists) {
        setStatusMessage(
          data.user_verified ?
          "Existing verified account found. Sending login code to your email..." :
          "Existing account found. Sending verification code to your email..."
        );
      }

      if (!data.cin_validation.isValid) {
        setError(
          data.cin_validation.message ||
          "No valid CIN number found. Please upload a clear CIN image."
        );
        setShowDialog(true);

      } else if (data.user_exists || data.admin_exists) {
        const candidateEmail = data.email;
        console.log("Candidate email for existing user:", candidateEmail);
        if (!candidateEmail) {
          setError(
            "An account was found, but the email address is not available. Please enter your email address to receive the verification code."
          );
          setShowEmailDialog(true);
        } else {
          setEmail(candidateEmail);
          setUserEmail(candidateEmail);
          setShowEmailDialog(false);
          await sendVerificationCode(candidateEmail, {
            cin_number: data.cin_number,
            username:
            data.full_name || data.extracted_data?.full_name ||
            data.extracted_data?.name ||
            `user${data.cin_number || ""}`,
            first_name: data.first_name || data.extracted_data?.first_name,
            last_name: data.last_name || data.extracted_data?.last_name,
            full_name: data.full_name || data.extracted_data?.full_name ||
            data.extracted_data?.name
          });
          keepLoading = true;
        }
      } else if (data.is_new_user) {
        const candidateEmail = data.email || email || "";
        if (candidateEmail) {
          setEmail(candidateEmail);
          setUserEmail(candidateEmail);
        }
        setShowEmailDialog(true);
      } else {
        setError("Unexpected response from server. Please try again.");
        setShowDialog(true);
      }
    } catch (error) {
      console.error(error);
      const errorMsg =
      error.response?.data?.message || "Processing failed. Please try again.";
      setError(errorMsg);
      setStatusMessage("");

      setShowDialog(true);
    } finally {
      if (!keepLoading) {
        setLoading(false);
      }
    }
  };




  const handleCloseDialog = () => {
    setShowDialog(false);
    setFiles([]);
    setError(null);
  };




  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setLoading(true);
      setStatusMessage(`Sending verification code to ${email}...`);
      const username =
      result?.full_name ||
      result?.extracted_data?.full_name ||
      result?.extracted_data?.name ||
      `user${result?.cin_number || ""}`;

      await sendVerificationCode(email, {
        cin_number: result?.cin_number,
        username,
        first_name: result?.first_name || result?.extracted_data?.first_name,
        last_name: result?.last_name || result?.extracted_data?.last_name,
        full_name: result?.full_name || result?.extracted_data?.full_name || result?.extracted_data?.name
      });

      setShowEmailDialog(false);
      setUserEmail(email);
    } catch (error) {
      console.error(error);
      const backendError =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to send verification email.";

      if (
      backendError ===
      "adress email already exists and is associated with an account")
      {
        setError("This email is already associated with an account. Please enter another email.");
        setShowEmailDialog(true);
        setShowDialog(false);
        setStatusMessage("");
        setLoading(false);
        return;
      }

      setError(backendError);
      setShowDialog(true);
      setLoading(false);
    }
  };




  const sendVerificationCode = async (email, options = {}) => {
    try {
      setLoading(true);
      setStatusMessage(`Sending verification code to ${email}...`);
      await api.post("/auth/send-code", {
        email,
        purpose: "verification",
        ...options
      });


      setShowCodeDialog(true);
    } catch (error) {
      console.error("Failed to send verification code:", error);
      setError("Failed to send verification code. Please try again.");
      setShowDialog(true);
      setStatusMessage("");
      setLoading(false);
    }
  };




  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const result = await verifyEmail(userEmail, verificationCode);
      if (result.success && result.token) {
        setShowCodeDialog(false);
        setVerificationCode("");
        setStatusMessage("");
        setLoading(false);
        loadUser();
        navigate('/welcom', { replace: true });
      } else {
        setError(result.error || "رمز التحقق غير صحيح");
        setStatusMessage("");
        setLoading(false);
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setError(
        error.response?.data?.error ||
        "Verification failed. Please check your code and try again."
      );
      setStatusMessage("");
      setLoading(false);
    }
  };



  const handleResendCode = async () => {
    if (!userEmail || resendingCode) {
      return;
    }

    try {
      setError(null);
      setResendingCode(true);
      const result = await resendCode(userEmail);

      if (result.success) {
        setStatusMessage(`A new verification code was sent to ${userEmail}.`);
      } else {
        setError(result.error || "Failed to resend the verification code.");
        setShowDialog(true);
      }
    } catch (error) {
      console.error("Resend code failed:", error);
      setError("Failed to resend the verification code. Please try again.");
      setShowDialog(true);
    } finally {
      setResendingCode(false);
    }
  };



  return (
    <>
      <div className="auth-container">
        <div className="bg-opening-layer" aria-hidden="true"></div>
        {showAuthUi &&
        <>
            {}
            <div className="bg-blob bg-blob-1"></div>
            <div className="bg-blob bg-blob-2"></div>
            <div className="bg-blob bg-blob-3"></div>
            <div className="bg-blob bg-blob-4"></div>
            <div className="bg-blob bg-blob-5"></div>

            {}
            {!loading &&
          <div className="auth-header-section"><img src={SmartArchiveLogo} alt="logo" style={{ width: '30%' }} />
                <div className="header-content">
                  <h1 className="header-title">SmartArchive</h1>
                </div>
              </div>
          }

            {}
            {!loading &&
          <div className="auth-box">
                <div className="auth-box-header">
                  <h2 className="auth-box-title">Upload Your CIN</h2>
                  <p className="auth-box-subtitle">Scan or drag your ID document</p>
                </div>
                {}
                <div
              className={`file-upload-area ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}>
              
                  <input
                type="file"
                id="file-input"
                onChange={handleChange}
                accept="image/*"
                multiple
                style={{ display: "none" }} />
              

                  {!files.length ?
              <label htmlFor="file-input" className="upload-label">
                      <div className="upload-icon">
                        <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className="upload-text">
                        <strong>Drag and drop</strong> your file here
                        <br />
                        or <span className="browse-link">browse</span> your computer
                      </p>
                      <p className="upload-hint">
                        Upload up to 2 images (JPG, PNG, WEBP...)
                      </p>
                    </label> :

              <div className="file-preview">
                      <div className="preview-icon">
                        <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    
                          <path d="M9 12l2 2 4-4" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      </div>
                      <p className="file-name">{files.map((selectedFile) => selectedFile.name).join(" | ")}</p>
                      <p className="file-size">
                        ({(files.reduce((sum, selectedFile) => sum + selectedFile.size, 0) / 1024).toFixed(2)} KB)
                      </p>
                      <button
                  className="remove-file-btn"
                  onClick={() => setFiles([])}>
                  
                        Remove
                      </button>
                    </div>
              }
                </div>
              </div>
          }

            {}
            <div className="auth-actions">
              {loading ?
            <div className="processing-container">
                  <DotLottieReact
                src="https://lottie.host/cdd0fb7a-1117-4847-8813-9dedb2389deb/nc0Q8br0Yg.lottie"
                loop
                autoplay
                style={{
                  width: "min(100%, 920px)",
                  height: "clamp(220px, 42vh, 420px)",
                  margin: "0 auto"
                }} />
              
                  <p style={{ textAlign: "center", margin: "0px auto" }}>
                    {statusMessage || (
                verificationResult ?
                "Processing verification..." :
                "Processing your file...")}
                  </p>
                </div> :
            verificationResult ?
            <div className="verification-result">
                  <div
                className={`result-image ${verificationResult.success ? "success" : "error"}`}>
                
                    {verificationResult.success ?
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#43e97b"
                  strokeWidth="2">
                  
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22,4 12,14.01 9,11.01" />
                      </svg> :

                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f5576c"
                  strokeWidth="2">
                  
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                }
                  </div>
                  <h3
                className={`result-title ${verificationResult.success ? "success" : "error"}`}>
                
                    {verificationResult.success ?
                "Verification Successful!" :
                "Verification Failed"}
                  </h3>
                  <p className="result-message">{verificationResult.message}</p>
                  {verificationResult.success &&
              <button
                className="continue-btn"
                onClick={() => navigate('/welcom', { replace: true })}>
                
                      Continue to Dashboard
                    </button>
              }
                  {!verificationResult.success &&
              <button
                className="retry-btn"
                onClick={() => window.location.reload()}>
                
                      Try Again
                    </button>
              }
                </div> :

            <div className="auth-primary-actions">
                  <button
                className="submit-btn"
                disabled={!files.length || loading}
                onClick={handleUpload}>
                
                    Continue With OCR
                  </button>
                  <Link to="/login" className="secondary-login-btn">
                    Already have an account? Log in
                  </Link>
                </div>
            }
              {!loading && !verificationResult &&
            <p className="auth-footer">Your data is secure and encrypted</p>
            }
            </div>
            {error &&
          <div
            className="error-message"
            style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
            
                {error}
              </div>
          }
          </>
        }
      </div>
      {}
      {showCodeDialog &&
      <div className="dialog-overlay">
          <div className="dialog-box code-dialog">
            <div className="dialog-header">
              <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#667eea"
              strokeWidth="2">
              
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <circle cx="12" cy="16" r="1" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <h3>Enter Verification Code</h3>
            </div>
            <form onSubmit={handleCodeSubmit} className="dialog-body">
              <p>
                We sent a 6-digit verification code to{" "}
                <strong>{userEmail}</strong>
              </p>
              <div className="code-input-group">
                <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="000000"
                maxLength="6"
                required
                className="code-input"
                autoFocus />
              
              </div>
              <div className="code-resend-row">
                <span className="code-resend-text">
                  Didn&apos;t receive the code?
                </span>
                <button
                type="button"
                className="code-resend-btn"
                onClick={handleResendCode}
                disabled={resendingCode}>
                
                  {resendingCode ? "Sending..." : "Resend Code"}
                </button>
              </div>
              <div className="dialog-footer">
                <button
                type="button"
                className="dialog-btn cancel-btn"
                onClick={() => {
                  setShowCodeDialog(false);
                  setLoading(false);
                  setStatusMessage("");
                  setFiles([]);
                }}>
                
                  Cancel
                </button>
                <button
                type="submit"
                className="dialog-btn submit-btn"
                disabled={verificationCode.length !== 6}>
                
                  Verify Code
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      {}
      {showEmailDialog &&
      <div className="dialog-overlay">
          <div className="dialog-box email-dialog">
            <div className="dialog-header">
              <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#667eea"
              strokeWidth="2">
              
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <h3>Welcome! Please verify your email</h3>
            </div>
            <form onSubmit={handleEmailSubmit} className="dialog-body">
              <p>
                Your CIN has been processed successfully. Please enter your
                email address to complete the registration.
              </p>
              <div className="email-input-group">
                <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="email-input" />
              
                {error &&
              <p className="dialog-inline-error">{error}</p>
              }
              </div>
              <div className="dialog-footer">
                <button
                type="button"
                className="dialog-btn cancel-btn"
                onClick={() => setShowEmailDialog(false)}>
                
                  Cancel
                </button>
                <button type="submit" className="dialog-btn submit-btn">
                  Send Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      }
      {}
      {showDialog &&
      <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f44336"
              strokeWidth="2">
              
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3>No CIN Number Detected</h3>
            </div>
            <div className="dialog-body">
              <p>
                {error ||
              "No valid CIN number found. Please upload a clear image of your CIN card containing an 8-digit number."}
              </p>
            </div>
            <div className="dialog-footer">
              <button className="dialog-btn" onClick={handleCloseDialog}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      }
    </>);

}
