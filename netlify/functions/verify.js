const functions = require('@netlify/functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

exports.handler = async (event) => {
  const { ref, type, email } = event.queryStringParameters;
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const res = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
  });
  const json = await res.json();
  if (json.status && json.data.status === 'success') {
    if (type === 'access') {
      const pass = Math.random().toString(36).slice(-8);
      await admin.auth().createUser({ uid: email, email, password: pass });
      await db.collection('verifiedUsers').doc(email).set({ paidApps: [] });
      await transporter.sendMail({
        from: `BluePay <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your BluePay Login Details",
        text: `Thanks for your payment. Your login password is: ${pass}`
      });
    } else {
      const doc = await db.collection('verifiedUsers').doc(email).get();
      const paidApps = doc.data().paidApps || [];
      paidApps.push(type);
      await db.collection('verifiedUsers').doc(email).update({ paidApps });
    }
    return { statusCode: 200, body: "Verified" };
  }
  return { statusCode: 400, body: "Payment verification failed" };
};
    
