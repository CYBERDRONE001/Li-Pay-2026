const firebaseConfig = { /* Your Firebase config */ };
const PAYSTACK_PUBLIC = 'YOUR_PAYSTACK_PUBLIC_KEY';
const DOWNLOADS = {
  app1: "https://example.com/app1.apk",
  app2: "https://example.com/app2.apk"
};
const APPS = [
  { id: 'app1', name: 'App One', price: 2500, img: 'https://via.placeholder.com/150' },
  { id: 'app2', name: 'App Two', price: 3000, img: 'https://via.placeholder.com/150' }
];

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function startPayment(type, amount, email) {
  if (!email) return alert('Enter your email');
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC,
    email, amount: amount * 100,
    callback: res => fetch(`/.netlify/functions/verify?ref=${res.reference}&type=${type}&email=${email}`)
                      .then(() => alert('✅ Payment complete! Check your email.')),
    onClose: () => alert('Payment cancelled.')
  });
  handler.openIframe();
}

async function login() {
  const e = document.getElementById('loginEmail').value.trim();
  const p = document.getElementById('loginPass').value;
  try {
    await auth.signInWithEmailAndPassword(e, p);
    const doc = await db.collection('verifiedUsers').doc(e).get();
    if (!doc.exists) throw 'Not verified';
    location='dashboard.html';
  } catch (err) { alert('Login failed: '+err); }
}

function logout() { auth.signOut().then(() => location='index.html'); }

function initApps() {
  auth.onAuthStateChanged(async user => {
    if (!user) return location='index.html';
    const email = user.email;
    const data = (await db.collection('verifiedUsers').doc(email).get()).data();
    const list = document.getElementById('appsList');
    APPS.forEach(app => {
      const allowed = data.paidApps?.includes(app.id);
      const card = document.createElement('div');
      card.className='app-card';
      card.innerHTML = `<img src="${app.img}"><h4>${app.name}</h4>
        ${allowed 
          ? `<a href="${DOWNLOADS[app.id]}" download>Download</a>` 
          : `<button onclick="startPayment('${app.id}', ${app.price}, '${email}')">Buy ₦${app.price}</button>`}`;
      list.appendChild(card);
    });
  });
}

if (location.pathname.endsWith('apps.html')) initApps();
