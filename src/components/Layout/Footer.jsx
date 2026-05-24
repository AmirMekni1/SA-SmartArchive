
import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© {currentYear} منصة التعريف الوطنية. جميع الحقوق محفوظة.</p>
        <p>Version 1.0.0</p>
      </div>
    </footer>);

};

export default Footer;
