import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';


export const validateRegister = (req, res, next) => {
    if (!req.body.username || req.body.username.length < 5) {
        return res.status(400).send({
            message: 'Please provid valid username !'
        });
    }

    if (!req.body.password || req.body.password.length < 5) {
        return res.status(400).send({
            message: 'Please provid valid password !'
        });
    }

    if (!req.body.password_repeat || req.body.password != req.body.password_repeat) {
        return res.status(400).send({
            message: 'Incorrect repeat password !'
        });
    }

    next();
}

export const isLoggedIn = (req, res, next) => {
    try {
        console.log(req.headers);
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
            token,
            'SECRETKEY'
        );
        req.userData = decoded;
        next();
    } catch (err) {
        return res.status(401).send({
            msg: 'Your session is not valid!'
        });
    }
}

export const isAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
            token,
            'SECRETKEYADMIN'
        );

        req.userData = decoded;
        next();
    } catch (err) {
        return res.status(401).send({
            msg: 'Your session is not valid!'
        });
    }

}

export const isModCours = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
            token,
            'SECRETKEYMODCOURS'
        );

        req.userData = decoded;
        next();
    } catch (err) {
        return res.status(401).send({
            msg: 'Your session is not valid!'
        });
    }
}

export const emailSend = async (req, res, next) => {
    let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
        },
    });

    const __dirname = path.resolve();
    const templatePath = path.join(__dirname, "template", "verify.html");
    console.log(templatePath);
    // const templateFile = fs.readFileSync(templatePath, 'utf-8');
    // const template = handlebars.compile(templateFile);
    // const replacements = {
    //     username:""
    // };
    // const finalHtml = template(replacements);



    let message = {
        from: '"Fred Foo 👻" <foo@example.com>', // sender address
        to: "bar@example.com, baz@example.com", // list of receivers
        subject: "Hello ✔", // Subject line
        html: finalHtml,
    }


    transporter.sendMail(message).then((info) => {
        return res.status(201)
            .json({
                msg: "you should receive an email",
                info: info.messageId,
                preview: nodemailer.getTestMessageUrl(info)
            })
    }).catch(error => {
        return res.status(500).json({ error })
    })
}