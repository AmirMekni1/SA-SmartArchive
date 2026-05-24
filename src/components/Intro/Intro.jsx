import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import "./Intro.css";

export default function IntroLogo() {
  return (
    <>
      <div className="intro-container">
        <div className="img">
          <DotLottieReact
            src="https://lottie.host/a4d5ea1a-508b-4d52-be49-9ee311e5ee41/1bxlvnWy5m.lottie"
            loop={false}
            autoplay />
          
        </div>
        <div className="intro-footer">
          <h1 className="intro-title">SmartArchive</h1>
          <p className="intro-subtitle">
            Intelligent Document Management System
          </p>
        </div>
      </div>
    </>);

}
