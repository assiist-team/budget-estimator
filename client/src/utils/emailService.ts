// Email service utilities
// TODO: Implement with Firebase Cloud Functions + SendGrid in Phase 2

import type { Estimate } from '../types';

/**
 * Send estimate email to client (placeholder for Phase 2)
 * 
 * To implement in Phase 2:
 * 1. Set up Firebase Cloud Functions
 * 2. Install SendGrid or similar email service
 * 3. Create email templates
 * 4. Attach PDF to email
 * 5. Send email via Cloud Function
 */
export async function sendEstimateEmail(
  estimate: Estimate,
  _pdfBlob?: Blob
): Promise<boolean> {
  console.log('Email service called for estimate:', estimate.id);
  console.log('Recipient:', estimate.clientInfo.email);
  
  // Placeholder implementation
  // In Phase 2, implement with Firebase Cloud Functions:
  
  // 1. Upload PDF to Firebase Storage
  // const storageRef = ref(storage, `estimates/${estimate.id}.pdf`);
  // await uploadBytes(storageRef, pdfBlob);
  // const pdfUrl = await getDownloadURL(storageRef);
  
  // 2. Call Cloud Function to send email
  // const sendEmailFunction = httpsCallable(functions, 'sendEstimateEmail');
  // const result = await sendEmailFunction({
  //   to: estimate.clientInfo.email,
  
  // 3. Cloud Function implementation (functions/src/index.ts):
  // export const sendEstimateEmail = functions.https.onCall(async (data, context) => {
  //   const msg = {
  //     to: data.to,
  //     from: 'estimates@1584design.com',
  //     subject: 'Your 1584 Interior Design Estimate',
  //     html: generateEmailHTML(data),
  //     attachments: [{
  //       filename: 'estimate.pdf',
  //       path: data.pdfUrl,
  //     }],
  //   };
  //   
  //   await sgMail.send(msg);
  //   return { success: true };
  // });
  
  console.warn('Email service not implemented yet. Will be added in Phase 2.');
  return true; // Return true for development
}

/**
 * Send notification email to admin
 */
export async function sendAdminNotification(estimate: Estimate): Promise<boolean> {
  console.log('Admin notification called for estimate:', estimate.id);
  
  // In Phase 2, send email to admin when new estimate is submitted
  // const adminEmail = 'benjamin@1584design.com';
  // const msg = {
  //   to: adminEmail,
  //   from: 'notifications@1584design.com',
  //   subject: 'New Estimate Submission',
  //   html: `
  //     <h2>New Estimate Submitted</h2>
  //     <p><strong>Client:</strong> ${estimate.clientInfo.firstName} ${estimate.clientInfo.lastName}</p>
  //     <p><strong>Email:</strong> ${estimate.clientInfo.email}</p>
  //     <p><a href="https://your-app.com/admin">View in Admin Dashboard</a></p>
  //   `,
  // };
  
  console.warn('Admin notification not implemented yet. Will be added in Phase 2.');
  return true;
}

/**
 * Generate HTML email template
 * Will be used in Phase 2 for email generation
 */
/*
function generateEmailHTML(data: {
  clientName: string;
  budgetRange: { low: number; high: number };
}): string {
  // In Phase 2, create a professional HTML email template
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A252F; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .budget { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #C9A868; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>1584 Interior Design</h1>
          <p>Your Project Estimate</p>
        </div>
        <div class="content">
          <p>Dear ${data.clientName},</p>
          <p>Thank you for your interest in 1584 Interior Design. Please find your project estimate attached.</p>
          <div class="budget">
            <h2>Estimated Budget Range</h2>
            <p style="font-size: 24px; color: #1A252F; margin: 0;">
              $${(data.budgetRange.low / 100).toLocaleString()} - $${(data.budgetRange.high / 100).toLocaleString()}
            </p>
          </div>
          <p>We've included estimates across four quality tiers to help you find the perfect balance for your project.</p>
          <p>We'll be in touch soon to discuss your project in detail.</p>
          <p>Best regards,<br>The 1584 Design Team</p>
        </div>
        <div class="footer">
          <p>1584 Interior Design | contact@1584design.com | www.1584design.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
*/

