//var argv = require('optimist').argv;
const request    = require('request');
const send       = require('gmail-send');
const nodemailer = require('nodemailer');
const needle     = require('needle');
const cheerio    = require('cheerio');

const fs         = require('fs');
const processed  = fs.existsSync('./processed.json') ? require('./processed.json') : [];

//search only freelance (remote=1)
const url        = 'https://moikrug.ru/vacancies?utf8=%E2%9C%93&q=&division_ids%5B%5D=&divisions%5B%5D=backend&divisions%5B%5D=frontend&divisions%5B%5D=apps&divisions%5B%5D=software&qid=&skills_finder=&salary=&currency=rur&location=&city_id=&company_name=&company_id=&employment_type=&remote=1&_=1548769415619';

needle.get(url, function(err, res) {
    if (err) throw err;

    var $ = cheerio.load(res.body, { decodeEntities: false } );
    var vacancies = [];

    $('div.inner').each((a, vac) => {
        var item = {
            title:  $(vac).find('div.title a').html(),
            href:   'https://moikrug.ru' + $(vac).find('div.title a').attr('href'),
            skills: $(vac).find('div.skills').text(),
            meta:   $(vac).find('div.meta').text(),
            salary: $(vac).find('div.salary').text(),
            date:   $(vac).find('span.date').text()
        };

        //not processed yet
        if ( processed.includes(item.href) ) {
            return;
        }
        processed.push(item.href);


        //filter by skills
        if ( item.title === null  ||
             item.title.match(/Ruby •/i)  ||
             item.title.match(/Python •/i)  ||
             item.title.match(/Golang •/i)  ||
             item.skills.match(/Ruby •/i)  ||
             item.skills.match(/Java •/i)  ||
             item.skills.match(/iOS •/i)  ||
             item.skills.match(/bitrix/i)  ||
             item.skills.match(/Wordpress/i)  ||
             item.skills.match(/Golang/i)  ||
             item.skills.match(/Python •/)  ||
             item.skills.match(/TensorFlow •/i)  ||
             item.skills.match(/битрикс/i)
        ) { return; };

        //salary field not empty and more than 100.000
        let salary = item.salary.replace(/От/g,'').replace(/до.*$/g,'').replace(/руб.*/g,'').replace(/\s/g,'').trim();
        if ( salary === "" || parseInt(salary) < 100000 ) 
            return;

        vacancies.push(item);
    })

    if ( vacancies.length == 0 ) {
        return;
    };
    fs.writeFile('./processed.json', JSON.stringify(processed, null, 4), 'utf8', ()=>{}); 



    var content = "";
    vacancies.forEach((item,index) => {
        content += `
            -------------------
            
            ${item.title}     (${item.salary})
            ${item.skills}
            ${item.href}
            ${item.date}
        `;
        //${item.meta}
    });


    

    //send email
    let smtpTransport;
    try {
        smtpTransport = nodemailer.createTransport({
            host:   'smtp.yandex.ru',
            port:   465,
            secure: true, // true for 465, false for other ports 587
            auth: {
                user: "email@yandex.ru",
                pass: "***************"
            }
        });
    } catch (e) {
        return console.log('Error: ' + e.name + ":" + e.message);
    }

    let mailOptions = {
        from:    'email@yandex.ru',
        to:      'email@gmail.com',
        subject: 'Новые вакансии', 
        text:    content,
    };

    smtpTransport.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log('Error');
        } else {
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
    });

    console.log('Done');

});
