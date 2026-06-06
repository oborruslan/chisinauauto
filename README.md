# Chirie Auto A.N.B

Site static pentru inchirieri auto in Ungheni, Republica Moldova.

## Fisiere principale

- `index.html` - structura paginii, masini, conditii, formular si criterii pentru Moldova.
- `styles.css` - design responsive pentru desktop si mobil, inclusiv cos, profil client si Paynet.
- `script.js` - meniu mobil, galerie, cos, profil client, istoric comenzi, WhatsApp si checkout Paynet configurabil.
- `imagini-auto-png/` - imaginile folosite in galerie.

## Paynet

Pagina este pregatita pentru Paynet, dar plata live trebuie initiata server-side. Nu pune
`MERCHANT_SEC_KEY`, utilizatorul API sau parola merchant in browser.

In `script.js`, seteaza `paynetConfig.createPaymentEndpoint` catre endpointul tau backend.
Endpointul trebuie sa primeasca payload-ul comenzii, sa creeze plata in Paynet si sa intoarca
fie `{ "redirectUrl": "..." }`, fie `{ "formHtml": "<form ...>...</form>" }`.

Documentatia Paynet pentru business mentioneaza plati online prin Visa/Mastercard, Paynet Wallet,
MIA, Google Pay si Apple Pay. Pentru productie foloseste URL-urile Paynet de productie si
credentialele merchant primite de la Paynet.

## Firebase

Profilul clientului are mod local si mod Firebase. Local este bun pentru demo; pentru productie
activeaza Firebase:

1. In Firebase Console, activeaza Authentication -> Sign-in method -> Email/Password.
2. Creeaza Cloud Firestore.
3. In `script.js`, seteaza `firebaseConfig.enabled = true` si completeaza obiectul
   `firebaseConfig.config` cu datele aplicatiei web Firebase.
4. Recomandare structura Firestore:
   - `clients/{uid}` pentru profil.
   - `clients/{uid}/orders/{orderId}` pentru istoric comenzi.
   - `clients/{uid}/payments/{paymentId}` pentru istoric plati.

Parolele si resetarea reala sunt gestionate de Firebase Auth. Pagina nu trebuie sa stocheze parole
in productie.

## Publicare pe GitHub Pages

1. Initializeaza repository-ul local, daca nu exista deja: `git init`.
2. Adauga remote-ul tau GitHub: `git remote add origin https://github.com/USER/REPO.git`.
3. Trimite fisierele: `git add .`, `git commit -m "Create car rental landing page"`, `git push -u origin main`.
4. In GitHub, activeaza Pages din `Settings` -> `Pages` -> branch `main` -> folder `/root`.

Pentru publicare finala, completeaza in pagina denumirea juridica, forma de organizare si IDNO-ul companiei.
