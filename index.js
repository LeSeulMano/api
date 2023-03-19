import express from 'express';
import cors from 'cors';
import Router from "./routes/router.js";

const app = express();

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization');
    res.header('Access-Control-Allow-Credentials', true);
    next();
  });

app.use(express.json());
// app.use(cors());
app.use(Router);

app.listen(5000, () => {
    console.log('Serveur running ...');
})