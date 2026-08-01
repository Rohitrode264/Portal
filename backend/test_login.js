fetch('http://localhost:5000/api/auth/login/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'CP20264981' })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
