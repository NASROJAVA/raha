const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure nodemailer for real email sending
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Helps with some certificate issues
  }
});

const contactController = {
  // Render contact page
  getContactPage: (req, res) => {
    res.render('pages/contact', { 
      title: 'اتصل بنا | راحة',
      user: req.session.user,
      success: req.query.success,
      error: req.query.error
    });
  },
  
  // Process contact form submission
  submitContactForm: async (req, res) => {
    try {
      const { name, email, subject, message } = req.body;
      
      // Validate input
      if (!name || !email || !message) {
        return res.redirect('/contact?error=يرجى ملء جميع الحقول المطلوبة');
      }
      
      // Prepare email to send to the visitor
      const mailOptions = {
  from: `"Raha Platform" <${process.env.EMAIL_USER}>`, // Use your platform email as sender
  to: 'nasreddine.java@gmail.com', // Replace this with the actual visitor email from req.body
  subject: 'رسالة جديدة من منصة راحة', // Email subject
  text: `
    تفاصيل الرسالة:
    الموضوع: ${subject || 'غير محدد'}
    الرسالة: ${message}

    مع خالص التقدير,
    فريق منصة راحة
  `,
  html: `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
      <div style="background-color: #f5f5f5; border-right: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
        <h3>تفاصيل الرسالة:</h3>
        <p><strong>المرسل :</strong> ${email || 'غير محدد'}</p>
        <p><strong>الموضوع :</strong> ${subject || 'غير محدد'}</p>
        <p><strong>الرسالة :</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      </div>
      <p>مع خالص التقدير،<br>فريق منصة راحة</p>
    </div>
  `
};

    
    
      try {
        // Send confirmation email to visitor
        const visitorInfo = await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent to visitor with ID:', visitorInfo.messageId);
        
        
        return res.redirect('/contact?success=تم إرسال رسالتك بنجاح. سنتواصل معك قريبًا.');
      } catch (emailError) {
        console.error('Specific email sending error:', emailError);
        
        // If Gmail fails, try to use a fallback method - store the message in the database
        try {
          // Create a logs directory if it doesn't exist
          const logsDir = path.join(__dirname, '..', 'logs');
          if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
          }
          
          // Save the message to a file as a fallback
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fallbackFile = path.join(logsDir, `failed-email-${timestamp}.json`);
          fs.writeFileSync(fallbackFile, JSON.stringify({
            name,
            email,
            subject,
            message,
            visitorEmail: mailOptions,
            timestamp: new Date().toISOString(),
            error: emailError.message
          }, null, 2));
          
          console.log(`Emails could not be sent but were saved to ${fallbackFile}`);
          return res.redirect('/contact?success=تم استلام رسالتك بنجاح ولكن هناك مشكلة في نظام البريد. سنتواصل معك قريبًا.');
        } catch (fallbackError) {
          console.error('Fallback error handling failed:', fallbackError);
          return res.redirect('/contact?error=حدث خطأ أثناء إرسال رسالتك. يرجى المحاولة مرة أخرى لاحقًا.');
        }
      }
    } catch (error) {
      console.error('General contact form error:', error);
      res.redirect('/contact?error=حدث خطأ أثناء معالجة النموذج. يرجى المحاولة مرة أخرى لاحقًا.');
    }
  }
};

module.exports = contactController;
