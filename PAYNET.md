# Integrare Paynet

Integrarea foloseste fluxul Server-Server din pachetul `cms-api`:

1. Site-ul trimite datele rezervarii la `POST /api/paynet/checkout`.
2. Serverul cere token la Paynet prin `POST /auth`.
3. Serverul creeaza plata prin `POST /api/Payments/Send`.
4. Clientul este redirectionat catre `https://test.paynet.md/acquiring/getecom`.

## Configurare locala

1. Copiaza `.env.example` in `.env`.
2. Completeaza parola API primita de la Paynet:

```env
PAYNET_MERCHANT_PASSWORD=parola_api_paynet
```

3. Porneste serverul:

```bash
npm start
```

4. Deschide:

```txt
http://localhost:8080
```

## Note

- Nu pune `.env` in git.
- Daca Paynet raspunde cu `invalid_grant`, credentialele API test trebuie verificate/resetate de Paynet.
- Pentru live, Paynet trebuie sa confirme hosturile finale, credentialele live si URL-urile de callback.
