import express from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 } from 'uuid';
import db from '../lib/db.js'
import { validateRegister, isLoggedIn, isAdmin, emailSend, isModCours } from '../middleware/user.js'
import nodemailer from 'nodemailer';
import multer from 'multer';
import fs from 'fs'

function generateVerificationCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

router.post('/sign-up', validateRegister, (req, res, next) => {
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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

const uplaod = multer({ storage: storage });

router.post('/upload', uplaod.single('file'), (req, res) => {
    let newname = req.body.newName;
    let extension = req.body.extension;
    if (!newname) {
        newname = req.file.originalname;
    }
    newname += '.' + extension

    let i = 1
    while (fs.existsSync(`uploads/${newname}`)) {
        console.log(newname);
        newname = `${req.body.newName}(${i}).${extension}`
        i++
    }

    fs.renameSync(`uploads/${req.file.filename}`, `uploads/${newname}`);

    res.send({
        status: 'success',
        file: req.file
    })
})


router.post('/cours', uplaod.single('file'), (req, res) => {
    try {
        db.query(`INSERT INTO cours (name, year, shpi, type, path_folder, matiere, auteur, nbDownload) VALUES ('${req.body.name}', '${req.body.year}', '${req.body.shpi}', '${req.body.type}', '${req.body.path}', '${req.body.matiere}', '${req.body.auteur}', 0)`, (err, result) => {
            if (err) {
                console.log(err);
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

router.get('/cours', (req, res) => {
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

router.get('/verify', (req, res) => {
    const email = req.query.email;
    const verificationCode = req.query.code;

    db.query('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, verificationCode], (err, result) => {
        if (err) {
            res.status(500).send('Error verifying email');
        } else if (result.length === 0) {
            res.status(400).send('Invalid verification code');
        } else {
            const userId = result[0].id;

            db.query('UPDATE users SET email_verified = 1 WHERE id = ?', [userId], (err, result) => {
                if (err) {
                    res.status(500).send('Error verifying email');
                } else {
                    res.send('Email verified');
                }
            });
        }
    });
})

router.post('/logout', (req, res, next) => {

    res.cookie('session', '', { maxAge: 0 });
    res.send({ message: 'Logged out successfully' });
})

router.post('/login', (req, res, next) => {
    db.query(`SELECT * FROM users WHERE email = ${db.escape(req.body.email)};`, (err, result) => {
        if (err) {
            throw err;
            return res.status(400).send({
                message: err
            })
        }
        if (!result.length) {
            return res.status(400).send({
                message: 'Email or password incorrect ! '
            })
        }

        bcrypt.compare(req.body.password, result[0]['password'], (bErr, bResult) => {
            if (bErr) {
                throw bErr;
                res.status(400).send({
                    message: 'Email or password incorrect ! '
                })
            }
            if (bResult) {
                if (result[0].admin == 1) {
                    const token = jwt.sign({
                        email: result[0].email,
                        userId: result[0].id,
                    }, 'SECRETKEYADMIN', {
                        expiresIn: '1d'
                    });
                    
                    try {
                        res.cookie('session', token, {
                            expires: new Date(Date.now() + 25892000000),
                            httpOnly: false,
                            sameSite: 'none'
                        })
                    }
                    catch (err) {
                        console.log(err);
                    }

                    db.query(`UPDATE users SET last_login = now() WHERE id = ${result[0].id}`);
                    return res.status(200).send({
                        message: 'Logged !',
                        token,
                        user: result[0]
                    })
                }
                else if (result[0].mod_cours == 1) {
                    const token = jwt.sign({
                        email: result[0].email,
                        userId: result[0].id,
                    }, 'SECRETKEYMODCOURS', {
                        expiresIn: '1d'
                    });
                    
                    try {
                        res.cookie('session', token, {
                            expires: new Date(Date.now() + 25892000000),
                            httpOnly: false,
                            sameSite: 'none'
                        })
                    }
                    catch (err) {
                        console.log(err);
                    }

                    db.query(`UPDATE users SET last_login = now() WHERE id = ${result[0].id}`);
                    return res.status(200).send({
                        message: 'Logged !',
                        token,
                        user: result[0]
                    })
                }
                else {
                    const token = jwt.sign({
                        email: result[0].email,
                        userId: result[0].id,
                    }, 'SECRETKEY', {
                        expiresIn: '1d'
                    });

                    try {
                        res.cookie('session', token, {
                            expires: new Date(Date.now() + 25892000000),
                            httpOnly: false,
                            sameSite: 'none'
                        })
                    }
                    catch (err) {
                        console.log(err);
                    }

                    db.query(`UPDATE users SET last_login = now() WHERE id = ${result[0].id}`);
                    return res.status(200).send({
                        message: 'Logged !',
                        token,
                        user: result[0]
                    })
                }
            }
            return res.status(400).send({
                message: 'Email or password incorrect ! '
            })
        })
    })

})

router.get('/secret-route', isLoggedIn, (req, res, next) => {
    res.send('This is the secret content. Only logged in users can see that!');
})

router.get('/admin', isAdmin, (req, res, next) => {
    res.send('This is the admin content. Only logged in users can see that!');
})

router.get('/mod-cours', isModCours, (req, res, next) => {
    res.send('This is the modcours content. Only logged in users can see that!');
})



router.post('/test', emailSend);


export default router;