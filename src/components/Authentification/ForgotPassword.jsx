import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';
import api from '../../services/api';
import SmartArchiveLogo from '../../assets/SmartArchiveLogo.png';
import './ForgotPassword.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resetPasswordWithFallback = async ({ email, code, newPassword }) => {
  const candidates = [
  () => api.post('/auth/reset-password', { email, code, newPassword }),
  () => api.post('/auth/forgot-password/reset', { email, code, newPassword }),
  () => api.post('/auth/change-password', { email, code, newPassword, purpose: 'reset' })];


  let latestError = null;
  for (const request of candidates) {
    try {
      const response = await request();
      return response.data;
    } catch (error) {
      latestError = error;
      const status = error?.response?.status;
      if (status && status !== 404) {
        throw error;
      }
    }
  }

  throw latestError || new Error('Reset password endpoint not found');
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: 'info', title: '', message: '' });
  const [error, setError] = useState('');

  const canSubmitStepOne = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const canSubmitStepTwo = useMemo(() => {
    return code.length === 6 && newPassword.length >= 8 && confirmPassword.length >= 8;
  }, [code.length, confirmPassword.length, newPassword.length]);

  const openDialog = (payload) => {
    setDialog({ open: true, ...payload });
  };

  const closeDialog = () => {
    setDialog((previous) => ({ ...previous, open: false }));
  };

  const sendRecoveryCode = async (event) => {
    event.preventDefault();
    if (!canSubmitStepOne) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await auth.sendCode({ email, purpose: 'reset' });
      setStep(2);
      openDialog({
        type: 'success',
        title: 'Code Sent',
        message: 'A 6-digit reset code has been sent to your email.'
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setError('');
      setLoading(true);

      await auth.verifyCode({ email, code, purpose: 'reset' });
      await resetPasswordWithFallback({ email, code, newPassword });

      openDialog({
        type: 'success',
        title: 'Password Updated',
        message: 'Your password has been reset successfully. You can now sign in.'
      });
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to reset password. Please verify your code.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setLoading(true);
      await auth.resendCode(email);
      openDialog({
        type: 'success',
        title: 'Code Resent',
        message: 'A new code has been sent. Check your inbox and spam folder.'
      });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to resend code at this moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
			<div className="forgot-orb forgot-orb-one" />
			<div className="forgot-orb forgot-orb-two" />

			<div className="forgot-card">
				<div className="forgot-brand">
					<img src={SmartArchiveLogo} alt="SmartArchive" className="forgot-logo" />
					<p className="forgot-eyebrow">Account Recovery</p>
				</div>

				<h1>{step === 1 ? 'Forgot Password' : 'Reset Password'}</h1>
				<p className="forgot-subtitle">
					{step === 1 ?
          'Enter your email to receive a verification code.' :
          'Confirm the code and set your new secure password.'}
				</p>

				{error && <p className="forgot-error">{error}</p>}

				{step === 1 ?
        <form onSubmit={sendRecoveryCode} className="forgot-form">
						<label>
							Email Address
							<input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value.trim())}
              placeholder="you@example.com"
              required />
            
						</label>

						<button type="submit" className="forgot-btn forgot-btn-primary" disabled={loading || !canSubmitStepOne}>
							{loading ? 'Sending...' : 'Send Verification Code'}
						</button>
					</form> :

        <form onSubmit={submitNewPassword} className="forgot-form">
						<label>
							Verification Code
							<input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              required />
            
						</label>

						<label>
							New Password
							<input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required />
            
						</label>

						<label>
							Confirm New Password
							<input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              minLength={8}
              required />
            
						</label>

						<div className="forgot-actions">
							<button type="button" className="forgot-btn forgot-btn-muted" onClick={resendCode} disabled={loading}>
								Resend Code
							</button>
							<button type="submit" className="forgot-btn forgot-btn-primary" disabled={loading || !canSubmitStepTwo}>
								{loading ? 'Updating...' : 'Update Password'}
							</button>
						</div>
					</form>
        }

				<p className="forgot-footer">
					Remember your password? <Link to="/login">Back to login</Link>
				</p>
			</div>

			{dialog.open &&
      <div className="forgot-dialog-backdrop" onClick={closeDialog}>
					<div className="forgot-dialog" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
						<h3 className={`forgot-dialog-title ${dialog.type}`}>{dialog.title}</h3>
						<p>{dialog.message}</p>
						<button type="button" className="forgot-btn forgot-btn-primary" onClick={closeDialog}>
							OK
						</button>
					</div>
				</div>
      }
		</div>);

};

export default ForgotPassword;
