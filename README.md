# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js


contract : 0x4C0A7D27c88C14F8AD716cF9ca83409B806D9997

new contract: 0xeC46Cf1ea6DC71B062942d2dE16796526d65Dd6c


npx hardhat run scripts/generateCodes.js --network amoy
'4edd80951db1f286', '855e2f4cb43583d9', '3eaf8c91ff3d3290'

Email delivery (.env required)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Iris Access <no-reply@yourdomain>"

Send QR PDF
POST http://localhost:3001/api/send-qr
{ "email": "user@example.com", "name": "Guest", "wallet": "0x...", "qrPayload": "QR_CONTENT" }
```
