import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 } from 'uuid';
import db from '../lib/db.js'
import { validateRegister, emailSend } from '../middleware/user.js'
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs'
import bodyParser from 'body-parser';


router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));



import cookieParser from 'cookie-parser';


router.use(cookieParser());

const SECRET_KEY = 'mysecretkey';
const SECRET_KEY_MOD = 'secretmod';

router.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  db.query(`SELECT * FROM users WHERE email = ${db.escape(email)};`, (err, result) => {
    if (err) {
      throw err;
    }
    if (!result.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    bcrypt.compare(password, result[0]['password'], (bErr, bResult) => {
      if (bErr) {
        throw bErr;
      }
      if (!bResult) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }
      if (result[0].mod_cours == 0) {
        const token = jwt.sign({ user: { id: result[0].id, email: result[0].email } }, SECRET_KEY, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, sameSite: 'none' });
        res.json({ success: true, message: 'Logged in successfully' });
      } else if (result[0].mod_cours == 1) {
        const token = jwt.sign({ user: { id: result[0].id, email: result[0].email } }, SECRET_KEY_MOD, { expiresIn: '1h' });
        console.log(token);
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true, message: 'Logged in successfully' });
      }
    });
  });
});

router.get('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.send({ message: 'Logged out successfully' });
});
router.get('/api/secret-route', (req, res) => {
    const token = req.cookies.token || req.body.token || req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    jwt.verify(token, SECRET_KEY , (err, decoded) => {
      if (err) {

        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      res.json({ success: true, message: 'You have access to the secret route' });

    });
  });
  
  // Route to access the mod route
  router.get('/api/mod-cours', (req, res) => {
    const token = req.cookies.token || req.body.token || req.query.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    jwt.verify(token, SECRET_KEY_MOD , (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
      res.json({ success: true, message: 'You have access to the secret route' });
    })
  });




// function generateVerificationCode() {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let code = '';
//     for (let i = 0; i < 6; i++) {
//         code += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return code;
// }

router.post('/api/sign-up', validateRegister, (req, res, next) => {
    db.query(`SELECT id FROM users WHERE email = '${req.body.email}'`, (err, result) => {
        if (result && result.length) {
            return res.status(409).send({
                message: 'This email is already use !'
            })
        }
        else {
            bcrypt.hash(req.body.password, 10, async (err, hash) => {
                if (err) {
                    throw err;
                    return res.status(500).send({
                        message: err
                    })
                } else {
                    const verificationCode = generateVerificationCode();
                    db.query(`INSERT INTO users (username, password, email, registered, last_login, verification_code) VALUES (${db.escape(
                        req.body.username
                    )}, ${db.escape(hash)}, ${db.escape(
                        req.body.email
                    )}, now(), now(), '${verificationCode}')`, (err, result) => {
                        if (err) {

                            throw err;
                            return res.status(400).send({
                                message: err,
                            })
                        }
                        return res.status(201).send({
                            message: 'Registered !'
                        })
                    })
                    // let testAccount = await nodemailer.createTestAccount();
                    // let transporter = nodemailer.createTransport({
                    //     host: "smtp.ethereal.email",
                    //     port: 587,
                    //     secure: false, // true for 465, false for other ports
                    //     auth: {
                    //         user: testAccount.user, // generated ethereal user
                    //         pass: testAccount.pass, // generated ethereal password
                    //     },
                    // });
                    // const verificationUrl = `http://localhost:5000/verify?email=${req.body.email}&code=${verificationCode}`;
                    // const mailOptions = {
                    //     from: 'smtp.ethereal.email',
                    //     to: req.body.email,
                    //     subject: 'Please verify your email address',
                    //     text: `Please click on this link to verify your email address: ${verificationUrl}`
                    // };
                    // transporter.sendMail(mailOptions, (err, info) => {
                    //     if (err) {
                    //         res.status(500).send('Error sending verification email');
                    //     } else {
                    //         // res.send('Verification email sent');
                    //         res.status(201)
                    //             .json({
                    //                 msg: "you should receive an email",
                    //                 info: info.messageId,
                    //                 preview: nodemailer.getTestMessageUrl(info)
                    //             })
                    //     }
                    // });
                }
            })
        }
    })

})

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('uploading file...');

  const newname = req.body.newName;
  const extension = req.body.extension;

  if (!newname) {
    return res.status(400).json({
      error: 'New name for the file is required.'
    });
  }

  const fileName = `${newname}.${extension}`;
  const filePath = `/var/www/uploads/${fileName}`;
  fs.writeFile(filePath, req.file.buffer, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: 'Failed to write file to disk.'
      });
    }

    console.log('file saved:', filePath);

    return res.json({
      status: 'success',
      fileName
    });
  });
});



router.post('/api/cours', (req, res) => {
    try {
        db.query(`INSERT INTO cours (name, year, shpi, type, path_folder, matiere, auteur, nbDownload) VALUES ('${req.body.name}', '${req.body.year}', '${req.body.shpi}', '${req.body.type}', ''${req.body.path}', '${req.body.matiere}', '${req.body.auteur}', 0)`, (err, result) => {

            if (err) {
                throw err;
                return res.status(500).send({
                    message: err

             })
            } else {
                res.send({
                    status: 'success'
                })
            }
        })
    } catch (err) {
        throw err;
        return res.status(500).send({
            message: err
        })
    }
})


router.get('/api/cours', (req, res) => {
    try {
        db.query("SELECT * FROM cours ORDER BY id DESC", (err, results) => {
            if (err) {
                throw err;
                return res.status(400).send({
                    message: err
                })
            } else {
                res.json(results)
            }
        })
    }catch(err) {
        console.log(err);
    }

})

// router.get('/api/config', (req, res) => {
//     res.send('This is the secret content. Only logged in users can see that!');
// })

// router.get('/verify', (req, res) => {
//     const email = req.query.email;
//     const verificationCode = req.query.code;

//     db.query('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, verificationCode], (err, result) => {
//         if (err) {
//             res.status(500).send('Error verifying email');
//         } else if (result.length === 0) {
//             res.status(400).send('Invalid verification code');
//         } else {
//             const userId = result[0].id;

//             db.query('UPDATE users SET email_verified = 1 WHERE id = ?', [userId], (err, result) => {
//                 if (err) {
//                     res.status(500).send('Error verifying email');
//                 } else {
//                     res.send('Email verified');
//                 }
//             });
//         }
//     });
// })


// router.post('/api/test', emailSend);


export default router;