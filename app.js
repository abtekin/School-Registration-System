require('dotenv').config({
    path: './.env'
});

const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const hbs = require('express-handlebars');
const exphbs = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
const e = require('express');
const {
    info
} = require('console');
const {
    fail
} = require('assert');
const {
    isEmpty,
    result
} = require('lodash');

const app = express();

const db = mysql.createPool({
    host: '**add ip**',
    user: '**add user**',
    password: '**add pass**',
    database: '**add database name**',
    connectionLimit: 10
})

app.set('views', path.join(__dirname, 'views'))
app.engine('handlebars', hbs.engine({
    defaultLayout: 'index'
}));
app.set('view engine', 'handlebars');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
//app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3030

app.get('/users', (req, res) => {
    let sql = 'SELECT Email, Password FROM user';
    let users = []
    db.query(sql, (err, result) => {
        if (err) throw err;

        for (let i = 0; i < result.length; i++) {
            let x = {
                email: result[i].Email,
                pass: result[i].Password
            };
            users.push(x);
        }
        res.json(users);
        res.render('users', {
            usr: users
        })
    })
})

app.listen(port, () => {
    console.log('Started server on ' + port);
})

app.get('/login', (req, res) => {
    //res.sendFile(path.join(__dirname, 'layout/login/index.html'));
    let path = req.path;
    res.locals.path = path;
    res.render('loginPage');
})

app.post('/login', (req, res) => {
    const emailP = "\'" + req.body.UN + "\'";
    const pwP = "\'" + req.body.PW + "\'";
    let sql = "SELECT Email, Password, First_Name, Last_Name, Role, User_Id FROM user WHERE user.Email = " + emailP + " AND user.Password = " + pwP + ";";
    let sql2 = 'SELECT * FROM courses INNER JOIN section ON courses.course_id = section.course_id INNER JOIN user ON user.User_Id = section.faculty_id WHERE section.semester_id = 9;';


    let courseNfaculty = [];
    let name = "";

    //console.log(courseNfaculty)
    db.query(sql, (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            req.session.loggedIn = true;
            req.session.username = result[0].First_Name;
            req.session.wholeName = result[0].First_Name + " " + result[0].Last_Name;
            req.session.email = result[0].Email;
            req.session.role = result[0].Role;
            req.session.uID = result[0].User_Id;
            failedLogin = false;
            res.redirect('/homePage');
            return;
        } else {
            failedLogin = true;
            res.redirect('/homePage');
            return;
        }
    })
})

app.get('/logout', (req, res) => {
    if (req.session.loggedIn === true) {
        req.session.loggedIn = false;
        req.session.username = null;
        req.session.wholeName = null;
        req.session.email = null;
        req.session.role = null;
        req.session.uID = null;
    }
    res.redirect('/');
    return;
})

let courseNfaculty = []
let courseNfaculty2 = []
let failedLogin = false;

app.post('/masterSched', (req, res) => {
    let sql = ""
    let semm = ""
    if (req.body.semester == 1) {
        sql = "SELECT * FROM courses INNER JOIN section ON courses.course_id = section.course_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id  INNER JOIN time_slot_period ON time_slot_period.time_slot_id = time_slot_days.time_slot_id INNER JOIN time_period ON time_period.time_period_id = time_slot_period.time_period_id WHERE section.semester_id = 1 "
        semm = 'Fall 2021'
    } else {
        sql = "SELECT * FROM courses INNER JOIN section ON courses.course_id = section.course_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id  INNER JOIN time_slot_period ON time_slot_period.time_slot_id = time_slot_days.time_slot_id INNER JOIN time_period ON time_period.time_period_id = time_slot_period.time_period_id WHERE section.semester_id = 9 "
        semm = 'Spring 2022'
    }

    if (req.body.sortBy == 1) {
        sql += " ORDER BY courses.course_title;"
    }
    if (req.body.sortBy == 2) {
        sql += " ORDER BY section.time_slot_id;"
    }
    if (req.body.sortBy == 3) {
        sql += " ORDER BY courses.credits;"
    }
    if (req.body.sortBy == 4) {
        sql += " ORDER BY user.First_Name;"
    }

    db.query(sql, (err, result) => {
        if (err) throw err

        courseNfaculty = []

        for (let i = 0; i < result.length; i++) {
            let x = {
                courseName: result[i].course_title,
                firstName: result[i].First_Name,
                lastName: result[i].Last_Name,
                timeDayOne: result[i].day_name_one,
                timeDayTwo: result[i].day_name_two,
                timeStart: result[i].start_time,
                timeEnd: result[i].end_time,
                Credits: result[i].credits,
            };
            courseNfaculty.push(x);
        }

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            semmy: semm
            //CNR2: courseNfaculty2
        });
        return;
    })

})

function nullCheck(id) {
    return !(id == null);
}

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/homePage', (req, res) => {
    let sql = 'SELECT * FROM courses INNER JOIN section ON courses.course_id = section.course_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id  INNER JOIN time_slot_period ON time_slot_period.time_slot_id = time_slot_days.time_slot_id INNER JOIN time_period ON time_period.time_period_id = time_slot_period.time_period_id WHERE section.semester_id = 1';

    db.query(sql, (err, result) => {
        if (err) throw err;
        for (let i = 0; i < result.length; i++) {
            let x = {
                courseName: result[i].course_title,
                firstName: result[i].First_Name,
                lastName: result[i].Last_Name,
                timeDayOne: result[i].day_name_one,
                timeDayTwo: result[i].day_name_two,
                timeStart: result[i].start_time,
                timeEnd: result[i].end_time,
                Credits: result[i].credits,
            };
            courseNfaculty.push(x);
        }
        shuffleArray(courseNfaculty);

        if (req.session.loggedIn) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: true,
                failed: failedLogin,
                CNR: courseNfaculty,
                semmy: 'Fall 2021'
                //CNR2: courseNfaculty2
            });
            return;
        }

        res.render('home', {
            loggedIn: false,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
            //CNR2: courseNfaculty2
        });
        return;
    })

})

function isFac(role) {
    return role === 'faculty' ? true : false;
}

function isAdm(role) {
    return role === 'admin' ? true : false;
}

function isStu(role) {
    return role === 'student' ? true : false;
}

app.get('/robertSched', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'PWalker@jajuniversity.com') {
        res.send('<h1>good Paul Walker</h1>');
    } else {
        res.send('<h1>bad NOT him</h1>')
    }
})

app.get('/addStudent', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('addStudent');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
    }
})

function timeToString(time) {
    return time == "'1'" ? "full" : "part";
}


let cs_grad_type = null
let cs_time = null
let cs_major = null
let cs_minor = null
let cs_program = null
let cs_email = null
let f_dept_id = null
let f_email = null

app.get('/addStudent/complete', (req, res) => {
    if (req.session.loggedIn != true || req.session.email != 'admin@jajuniversity.com') {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
    } else {
        let sql1 = "SELECT `User_Id` FROM `user` WHERE `Email` =" + cs_email + ";";
        db.query(sql1, (err, result) => {
            if (err || result.length == 0) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    failedToReg: true,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    uID: id,
                    registering: true,
                    CNR: courseNfaculty,
                    semmy: 'Fall 2021'
                });
                return;
            } else {
                id = result[0].User_Id;
                sqlStudentTable = "INSERT INTO `student` (`student_id`, `GPA`, `student_type`) VALUES (" + id + ", NULL, 'undergrad');"
                db.query(sqlStudentTable, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            failedToReg: true,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            uID: id,
                            registering: true,
                            CNR: courseNfaculty,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    let sqlGradType = ""
                    let sqlTime = ""

                    if (true) {
                        sqlGradType = "INSERT INTO `undergrad_student` (`student_id`, `time_type`) VALUES (" + id + ", " + (cs_time == "'1'" ? "'full'" : "'part'") + ");"
                        if (true) {
                            sqlTime = "INSERT INTO `undergrad_full` (`student_id`, `max_credits`, `min_credits`) VALUES (" + id + ", '20', '12')"
                        } else {
                            sqlTime = "INSERT INTO `undergrad_full` (`student_id`, `max_credits`, `min_credits`) VALUES (" + id + ", '20', '12')"
                        }
                    } else {
                        sqlGradType = "INSERT INTO `grad_student` (`student_id`, `time_type`) VALUES (" + id + ", " + (cs_time == "'1'" ? "'full'" : "'part'") + ");"
                        if (cs_time == "'0'") {
                            sqlTime = "INSERT INTO `grad_part` (`student_id`, `max_credits`) VALUES (" + id + ", '11')"
                        } else {
                            sqlTime = "INSERT INTO `grad_full` (`student_id`, `max_credits`, `min_credits`) VALUES (" + id + ", '20', '12')"
                        }
                    }

                    db.query(sqlGradType, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                failedToReg: true,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                uID: id,
                                registering: true,
                                CNR: courseNfaculty,
                                semmy: 'Fall 2021'
                            });
                            return
                        }

                    })



                    db.query(sqlTime, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                failedToReg: true,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                uID: id,
                                registering: true,
                                CNR: courseNfaculty,
                                semmy: 'Fall 2021'
                            });
                            return
                        }


                    })

                    if (true) {
                        let sqlMaj = "INSERT INTO `student_major` (`student_id`, `major_id`) VALUES (" + id + ", " + cs_major + ");"
                        let sqlMin = "INSERT INTO `student_minor` (`student_id`, `minor_id`) VALUES (" + id + ", " + cs_minor + ");"

                        db.query(sqlMaj, (err, result) => {
                            if (err) {
                                console.log(err)
                                res.render('home', {
                                    userName: req.session.username,
                                    fac: isFac(req.session.role),
                                    admin: isAdm(req.session.role),
                                    student: isStu(req.session.role),
                                    loggedIn: req.session.loggedIn,
                                    failedToReg: true,
                                    id: req.session.uID,
                                    wholeName: req.session.wholeName,
                                    uID: id,
                                    registering: true,
                                    CNR: courseNfaculty,
                                    semmy: 'Fall 2021'
                                });
                                return
                            }


                        })
                        if (cs_minor != "'0'") {
                            db.query(sqlMin, (err, result) => {
                                if (err) {
                                    console.log(err)
                                    res.render('home', {
                                        userName: req.session.username,
                                        fac: isFac(req.session.role),
                                        admin: isAdm(req.session.role),
                                        student: isStu(req.session.role),
                                        loggedIn: req.session.loggedIn,
                                        id: req.session.uID,
                                        wholeName: req.session.wholeName,
                                        failedToReg: true,
                                        uID: id,
                                        registering: true,
                                        CNR: courseNfaculty,
                                        semmy: 'Fall 2021'
                                    });
                                    return
                                }
                            })
                        }

                    } else {
                        let sqlGradPro = "INSERT INTO `grad_registration` (`grad_program_id`, `student_id`) VALUES (" + cs_program + ", " + id + ");"

                        db.query(sqlGradPro, (err, result) => {
                            if (err) {
                                console.log(err)
                                res.render('home', {
                                    userName: req.session.username,
                                    fac: isFac(req.session.role),
                                    admin: isAdm(req.session.role),
                                    student: isStu(req.session.role),
                                    loggedIn: req.session.loggedIn,
                                    failedToReg: true,
                                    id: req.session.uID,
                                    wholeName: req.session.wholeName,
                                    uID: id,
                                    registering: true,
                                    CNR: courseNfaculty,
                                    semmy: 'Fall 2021'
                                });
                                return
                            }


                        })
                    }


                })

                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    failedToReg: false,
                    uID: id,
                    registering: true,
                    CNR: courseNfaculty,
                    semmy: 'Fall 2021'
                });
                return
            }
        })
    }
})

app.post('/addStudent', (req, res) => {
    const grad_type = "\'" + req.body.grad_type + "\'";
    const time = "\'" + req.body.time + "\'";
    const email = "\'" + req.body.email + "\'";
    const password = "\'" + req.body.password + "\'";
    const f_name = "\'" + req.body.f_name + "\'";
    const l_name = "\'" + req.body.l_name + "\'";
    const major = "\'" + req.body.major + "\'";
    const minor = "\'" + req.body.minor + "\'";
    const grad_program = "\'" + req.body.gradProg + "\'";

    let failed_To_Reg = false;
    let id = 'none';

    let sql = "INSERT INTO `user` (`User_Id`, `Email`, `Password`, `First_Name`, `Last_Name`, `Street_Address`, `City`, `State`, `Zipcode`, `Phone`, `Role`) VALUES (NULL, " + email + ", " + password + ", " + f_name + ", " + l_name + ", 'none', 'city', 'state', 'zipcode', 'phonenumber', 'student')";
    let sql3 = "DELETE FROM `user` WHERE `user`.`User_Id` = 2531 AND `user`.`Email` = \'cs@gmail.com\'";
    let sqlStudentTable = ""

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                failedToReg: true,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                uID: id,
                registering: true,
                CNR: courseNfaculty,
                semmy: 'Fall 2021'
            });
            return;
        } else {
            cs_grad_type = grad_type
            cs_time = time
            cs_major = major
            cs_minor = minor
            cs_program = grad_program
            cs_email = email
            res.render('addStudent', {
                confirm: true
            })
            return;
        }

    })

})

let isDenied = false;

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

app.get('/addFaculty', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('addFaculty');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
    }
})

app.post('/addFaculty', (req, res) => {
    const time = "'" + req.body.time + "'";
    const email = "'" + req.body.email + "'";
    const password = "'" + req.body.password + "'";
    const f_name = "'" + req.body.f_name + "'";
    const l_name = "'" + req.body.l_name + "'";
    const department = "'" + req.body.department + "'";
    let sql = "INSERT INTO user (User_Id, Email, Password, First_Name, Last_Name, Street_Address, City, State, Zipcode, Phone, Role) VALUES (NULL, " + email + ", " + password + ", " + f_name + ", " + l_name + ", 'none', 'city', 'state', 'zipcode', 'phonenumber', 'faculty')";



    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                failedToReg: true,
                uID: id,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                registeringFaculty: true,
                CNR: courseNfaculty,
                semmy: 'Fall 2021'
            });
            return;
        } else {

            f_dept_id = department
            f_time = time
            f_email = email
            res.render('addFaculty', {
                confirm: true
            })
            return;
        }

    })
})


app.get('/addFaculty/complete', (req, res) => {
    if (req.session.loggedIn != true || req.session.email != 'admin@jajuniversity.com') {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            CNR: courseNfaculty,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            semmy: 'Fall 2021'
        });

    } else {
        let sql1 = "SELECT `User_Id` FROM `user` WHERE `Email` =" + f_email + ";";
        db.query(sql1, (err, result) => {
            if (err || result.length == 0) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    failedToReg: true,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    uID: id,
                    registeringFaculty: true,
                    CNR: courseNfaculty,
                    semmy: 'Fall 2021'
                });
                return;
            } else {
                id = result[0].User_Id;
                sqlStudentTable = "INSERT INTO `faculty` (`Faculty_Id`, `Dept_Id`) VALUES (" + id + ", " + f_dept_id + ");"
                db.query(sqlStudentTable, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            failedToReg: true,
                            uID: id,
                            registeringFaculty: true,
                            CNR: courseNfaculty,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        failedToReg: false,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        uID: id,
                        registeringFaculty: true,
                        CNR: courseNfaculty,
                        semmy: 'Fall 2021'
                    });
                    return;
                })
            }

        })

    }
})

app.get('/addCourse', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('addCourse');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
        return
    }
})

app.post('/addCourse', (req, res) => {
    const c_id = "\'" + req.body.c_id + "\'";
    const c_dept = "\'" + req.body.c_dept + "\'";
    const c_title = "\'" + req.body.c_title + "\'";
    const c_desc = "\'" + req.body.c_desc + "\'";
    const c_credits = "\'" + req.body.c_credits + "\'";
    let sql = "INSERT INTO `courses` (`course_id`, `dept_id`, `course_title`, `course_desc`, `credits`) VALUES (" + c_id + ", " + c_dept + ", " + c_title + ", " + c_desc + ", " + c_credits + ")";

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                failedToAddCourse: true,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                addingCourse: true,
                semmy: 'Fall 2021'
            });
            return;
        }

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            failedToAddCourse: false,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty,
            addingCourse: true,
            semmy: 'Fall 2021'
        });
        return;
    })

})


app.get('/addClass', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('addClass');
        return;
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
        return;
    }
})



app.post('/addClass', (req, res) => {
    const c_id = "\'" + req.body.c_id + "\'";
    const c_faculty = "\'" + req.body.c_faculty + "\'";
    const c_room_id = "\'" + req.body.c_room_id + "\'";
    const c_time_slot = "\'" + req.body.c_time_slot + "\'";
    const c_capacity = "\'" + req.body.c_capacity + "\'";
    let sql = "INSERT INTO `section` (`section_id`, `course_id`, `semester_id`, `faculty_id`, `room_id`, `time_slot_id`, `capacity`) VALUES (NULL, " + c_id + ",9 , " + c_faculty + ", " + c_room_id + ", " + c_time_slot + ", " + c_capacity + ")";
    let checkTime = "SELECT * FROM `section` WHERE `room_id`= " + c_room_id + " AND `time_slot_id` = " + c_time_slot + " AND `semester_id` = 9;"
    let checkFac = "SELECT * FROM `section` WHERE `faculty_id` = " + c_faculty + " AND semester_id = 9 AND time_slot_id = " + c_time_slot + ";"

    let sqlClasses = "SELECT *, COUNT(*) AS cnt FROM section WHERE faculty_id = " + c_faculty + " AND semester_id = 9"

    db.query(sqlClasses, (err, resulo) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
                //CNR2: courseNfaculty2
            });
            return;
        }

        if (resulo.length > 0) {
            if (resulo[0].cnt >= 3) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    tooManyClasses: true
                    //CNR2: courseNfaculty2
                });
                return;
            }
        }
        db.query(checkTime, (err, result) => {
            if (err || result.length > 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    failedToAddClass: true,
                    CNR: courseNfaculty,
                    addingClass: true,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    semmy: 'Fall 2021'
                });
                return;
            } else {
                db.query(checkFac, (err, result1) => {
                    if (err) {
                        console.log(err)
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            failedToAddClass: true,
                            CNR: courseNfaculty,
                            addingClass: true,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    if (result1.length > 0) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            timeOverlap: true,
                            CNR: courseNfaculty,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    db.query(sql, (err, result) => {
                        if (err) {
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                failedToAddClass: true,
                                CNR: courseNfaculty,
                                addingClass: true,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                semmy: 'Fall 2021'
                            });
                            return;
                        }

                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            failedToAddClass: false,
                            CNR: courseNfaculty,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            addingClass: true,
                            semmy: 'Fall 2021'
                        });
                        return;
                    })
                })
            }
        })
    })

})

app.get('/viewSchedule', (req, res) => {
    res.render('enterUID', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})

app.post('/viewSchedule', (req, res) => {
    let id = "\'" + req.body.uID + "\'";
    const role = "\'" + req.body.role + "\'";
    const semester = "\'" + req.body.semester + "\'";
    if (req.session.role == 'student') {
        id = req.session.uID
    }
    if (id != req.session.uID && req.session.email != 'admin@jajuniversity.com' && req.session.role != 'faculty') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR2: courseNfaculty2,
            cantView: true,
            semmy: 'Fall 2021'
        });
        return;
    } else {
        let sql = "";
        if (req.body.role == "2") {
            sql = "SELECT * FROM section INNER JOIN courses ON section.course_id = courses.course_id INNER JOIN user on section.faculty_id = user.User_Id INNER JOIN rooms ON rooms.room_id = section.room_id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id WHERE user.User_Id = " + id + " AND section.semester_id = " + semester + ";"
        } else {
            sql = "SELECT * FROM class_registration INNER JOIN user ON user.User_Id = class_registration.student_id INNER JOIN section ON class_registration.section_id = section.section_id AND section.semester_id = " + semester + " INNER JOIN rooms ON rooms.room_id = section.room_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id WHERE user.User_Id = " + id + ";"
        }
        db.query(sql, (err, result) => {
            if (err) {
                console.log(err);
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    cantView: true,
                    semmy: 'Fall 2021'
                });
                return;
            } else {
                if (result.length <= 0) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR: courseNfaculty,
                        CNR2: courseNfaculty2,
                        noClasses: true,
                        semmy: 'Fall 2021'
                    });
                    return;
                }
                let users = []
                for (let i = 0; i < result.length; i++) {
                    let x = {
                        courseName: result[i].course_title,
                        roomNum: result[i].room_number,
                        building: result[i].building,
                        cID: result[i].course_id,
                        sID: result[i].section_id,
                        days: result[i].day_name_one + " - " + result[i].day_name_two,
                        time: result[i].time
                    };
                    users.push(x);
                }
                res.render('schedule', {
                    userData: users,
                    name: result[0].First_Name + " " + result[0].Last_Name,
                    //make schedule with name and classes
                })
            }
        })
    }
})

app.get('/viewAdvisee', (req, res) => {
    if (req.session.loggedIn === true && req.session.role === 'faculty') {
        let sql = "SELECT * FROM advisor INNER JOIN user ON user.User_Id = advisor.student_id WHERE advisor.faculty_id = " + req.session.uID + ";";

        db.query(sql, (err, result) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR2: courseNfaculty2,
                    adviseeError: true,
                    semmy: 'Fall 2021'
                });
                return;
            }
            let userData = [];
            for (let i = 0; i < result.length; i++) {
                let x = {
                    name: result[i].First_Name + " " + result[i].Last_Name,
                    idNum: result[i].User_Id
                };
                userData.push(x);
            }
            res.render('viewAdvisee', {
                userData: userData,
                wholeName: req.session.wholeName
                //make schedule with name and classes
            })
        })

        return;
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
        return;
    }
})

app.get('/viewAdvisor', (req, res) => {
    if (req.session.loggedIn === true && req.session.role === 'student') {
        let sql = "SELECT * FROM advisor INNER JOIN user ON user.User_Id = advisor.faculty_id WHERE advisor.student_id = " + req.session.uID + ";";

        db.query(sql, (err, result) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    adviseeError: true,
                    semmy: 'Fall 2021'
                });
                return;
            }
            let userData = [];
            for (let i = 0; i < result.length; i++) {
                let x = {
                    name: result[i].First_Name + " " + result[i].Last_Name,
                    idNum: result[i].User_Id
                };
                if (userData.length <= 0) {
                    userData.push(x);
                }
            }
            res.render('viewAdvisor', {
                userData: userData,
                wholeName: req.session.wholeName
                //make schedule with name and classes
            })
        })

        return;
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            failed: failedLogin,
            CNR: courseNfaculty,
            semmy: 'Fall 2021'
        });
        return;
    }
})

app.post('/viewClasses', (req, res) => {

    let sql = "SELECT * FROM section INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN user ON section.faculty_id = user.User_Id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id INNER JOIN time_slot_period ON time_slot_period.time_slot_id = time_slot_days.time_slot_id INNER JOIN time_period ON time_period.time_period_id = time_slot_period.time_period_id INNER JOIN rooms ON rooms.room_id = section.room_id WHERE section.semester_id = 9";

    if (req.body.sortBy == 1) {
        sql += " ORDER BY courses.course_title;"
    }
    if (req.body.sortBy == 2) {
        sql += " ORDER BY section.time_slot_id;"
    }
    if (req.body.sortBy == 3) {
        sql += " ORDER BY courses.credits;"
    }
    if (req.body.sortBy == 4) {
        sql += " ORDER BY user.First_Name;"
    }

    let map = new Map();

    let wtf = "SELECT *, count(*) AS cnt FROM section INNER JOIN class_registration ON section.section_id = class_registration.section_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN rooms ON rooms.room_id = section.room_id WHERE section.semester_id = 9 GROUP by class_registration.section_id;"
    db.query(wtf, (err, result1) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                error: true,
                semmy: 'Fall 2021'
            });
            return;
        }

        if (result1.length > 0) {
            for (let i = 0; i < result1.length; i++) {
                map.set(result1[i].section_id, result1[i].capacity - result1[i].cnt)
            }
        }

        db.query(sql, (err, result) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    error: true,
                    semmy: 'Fall 2021'
                });
                return;
            }
            let userData = [];
            for (let i = 0; i < result.length; i++) {
                let x = {
                    name: result[i].First_Name + " " + result[i].Last_Name,
                    className: result[i].course_title,
                    course_id: result[i].course_id,
                    secID: result[i].section_id,
                    day: result[i].day_name_one + " - " + result[i].day_name_two,
                    time: result[i].time,
                    credits: result[i].credits,
                    room: result[i].room_number,
                    building: result[i].building,
                    seats: getSeatsLeft(result[i].section_id, map)
                };
                userData.push(x)
            }
            res.render('classes', {
                userData: userData
                //make schedule with name and classes
            })
        })
    })
})

app.get('/viewClasses', (req, res) => {
    let sql = "SELECT * FROM section INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN user ON section.faculty_id = user.User_Id INNER JOIN time_slot_days ON time_slot_days.time_slot_id = section.time_slot_id INNER JOIN time_slot_period ON time_slot_period.time_slot_id = time_slot_days.time_slot_id INNER JOIN time_period ON time_period.time_period_id = time_slot_period.time_period_id INNER JOIN rooms ON rooms.room_id = section.room_id WHERE section.semester_id = 9;";
    //let sql = "SELECT * FROM `section` WHERE section.`semester_id`=9" 

    let map = new Map();

    let wtf = "SELECT *, count(*) AS cnt FROM section INNER JOIN class_registration ON section.section_id = class_registration.section_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN rooms ON rooms.room_id = section.room_id WHERE section.semester_id = 9 GROUP by class_registration.section_id;"
    let wtf2 = "SELECT * FROM section WHERE section.semester_id = 9 AND section.section_id NOT IN(SELECT section.section_id FROM section INNER JOIN class_registration ON section.section_id = class_registration.section_id INNER JOIN user ON user.User_Id = section.faculty_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN rooms ON rooms.room_id = section.room_id WHERE section.semester_id = 9 GROUP by class_registration.section_id);"
    db.query(wtf, (err, result1) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                error: true,
                semmy: 'Fall 2021'
            });
            return;
        }

        if (result1.length > 0) {
            for (let i = 0; i < result1.length; i++) {
                map.set(result1[i].section_id, result1[i].capacity - result1[i].cnt)
            }
        }

        db.query(wtf2, (err, result2) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    error: true,
                    semmy: 'Fall 2021'
                });
                return;
            }

            if (result2.length > 0) {
                for (let ii = 0; ii < result2.length; ii++) {
                    map.set(result2[ii].section_id, result2[ii].capacity)
                }
            }

            db.query(sql, (err, result) => {
                if (err) {
                    console.log(err)
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR: courseNfaculty,
                        CNR2: courseNfaculty2,
                        error: true,
                        semmy: 'Fall 2021'
                    });
                    return;
                }
                let userData = [];
                for (let i = 0; i < result.length; i++) {
                    let x = {
                        name: result[i].First_Name + " " + result[i].Last_Name,
                        className: result[i].course_title,
                        course_id: result[i].course_id,
                        secID: result[i].section_id,
                        day: result[i].day_name_one + " - " + result[i].day_name_two,
                        time: result[i].time,
                        credits: result[i].credits,
                        room: result[i].room_number,
                        building: result[i].building,
                        seats: getSeatsLeft(result[i].section_id, map)
                    };
                    userData.push(x)
                }
                res.render('classes', {
                    userData: userData
                    //make schedule with name and classes
                })
            })
        })
    })
})

function getSeatsLeft(secID, map) {
    if (map.has(secID)) {
        return map.get(secID)
    }
    return 10;
}

app.get('/registration', (req, res) => {
    if (req.session.role != 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            cantReg: true,
            semmy: 'Fall 2021'
        });
        return;
    }
    res.render('registration');
})

app.post('/registration', (req, res) => {
    if (!req.session.loggedIn) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            cantReg: true,
            semmy: 'Fall 2021'
        });
        return;
    }
    const cid = "\'" + req.body.cID + "\'";
    const secID = "\'" + req.body.secID + "\'";
    let sql = "SELECT * FROM prereq WHERE prereq.course_id = " + cid + ";"
    let sqlTook = "SELECT * FROM class_registration INNER JOIN student_history ON class_registration.student_id = student_history.student_id WHERE class_registration.student_id = " + req.session.uID + " AND (student_history.grade LIKE 'C' OR student_history.grade LIKE 'C+' OR student_history.grade LIKE 'B-' OR student_history.grade LIKE 'B' OR student_history.grade LIKE 'B+' OR student_history.grade LIKE 'A-' OR student_history.grade LIKE 'A') AND student_history.grade NOT LIKE 'C-';"
    let sqlTaking = "SELECT * FROM `class_registration` INNER JOIN section ON class_registration.section_id = section.section_id WHERE `student_id`= " + req.session.uID + ";"

    let needed = []
    let took = []

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            return;
        }

        for (let i = 0; i < result.length; i++) {
            needed.push(result[i].prereq_course_id)
        }

        db.query(sqlTook, (err, result1) => {
            if (err) {
                console.log(err)
                return;
            }
            for (let i = 0; i < result1.length; i++) {
                took.push(result1[i].course_id)
            }

            db.query(sqlTaking, (err, result2) => {
                if (err) {
                    console.log(err)
                    return;
                }
                for (let i = 0; i < result2.length; i++) {
                    took.push(result2[i].course_id)
                }

                for (let j = 0; j < needed.length; j++) {
                    if (!took.includes(needed[j])) {
                        console.log(took)
                        console.log(needed)
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            CNR: courseNfaculty,
                            CNR2: courseNfaculty2,
                            missingP: true,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }
                }
                //console.log(req.body.cID)
                if (took.includes(req.body.cID)) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR2: courseNfaculty2,
                        alreadyT: true,
                        semmy: 'Fall 2021'
                    });
                    return;
                }

                let takingTimes = "SELECT * FROM `class_registration` INNER JOIN section ON class_registration.section_id = section.section_id WHERE `student_id`= " + req.session.uID + " AND section.semester_id = 9;"

                let classAmout = "SELECT * FROM `class_registration` INNER JOIN section ON class_registration.section_id = section.section_id WHERE section.semester_id = 9 AND class_registration.student_id = " + req.session.uID + ";"

                let holds = "SELECT * FROM student_holds WHERE student_holds.student_id = " + req.session.uID + ";"

                let sqlSeats = "SELECT `section_id`, COUNT(`section_id`) AS cnt FROM `class_registration` WHERE `section_id` = " + secID + ";"

                db.query(holds, (err, result8) => {
                    if (err) {
                        console.log(err)
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            CNR: courseNfaculty,
                            CNR2: courseNfaculty2,
                            error: true,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    if (result8.length > 0) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            CNR: courseNfaculty,
                            CNR2: courseNfaculty2,
                            hold: true,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    db.query(classAmout, (err, result7) => {
                        if (err) {
                            console.log(err)
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                CNR: courseNfaculty,
                                CNR2: courseNfaculty2,
                                error: true,
                                semmy: 'Fall 2021'
                            });
                            return;
                        }

                        if (result7.length >= 4) {
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                CNR: courseNfaculty,
                                CNR2: courseNfaculty2,
                                tooMany: true,
                                semmy: 'Fall 2021'
                            });
                            return;
                        }

                        db.query(takingTimes, (err, result6) => {
                            if (err) {
                                console.log(err)
                                res.render('home', {
                                    userName: req.session.username,
                                    fac: isFac(req.session.role),
                                    admin: isAdm(req.session.role),
                                    student: isStu(req.session.role),
                                    loggedIn: req.session.loggedIn,
                                    id: req.session.uID,
                                    wholeName: req.session.wholeName,
                                    CNR: courseNfaculty,
                                    CNR2: courseNfaculty2,
                                    error: true,
                                    semmy: 'Fall 2021'
                                });
                                return;
                            }

                            let sqlTimeOfClass = "SELECT * FROM `section` WHERE section_id = " + secID + ";"

                            db.query(sqlTimeOfClass, (err, result7) => {
                                if (err) {
                                    console.log(err)
                                    res.render('home', {
                                        userName: req.session.username,
                                        fac: isFac(req.session.role),
                                        admin: isAdm(req.session.role),
                                        student: isStu(req.session.role),
                                        loggedIn: req.session.loggedIn,
                                        id: req.session.uID,
                                        wholeName: req.session.wholeName,
                                        CNR: courseNfaculty,
                                        CNR2: courseNfaculty2,
                                        error: true,
                                        semmy: 'Fall 2021'
                                    });
                                    return;
                                }

                                // if (result6.length <= 0 || result7.length <= 0) {
                                //     res.render('home', {
                                //         userName: req.session.username,
                                //         fac: isFac(req.session.role),
                                //         admin: isAdm(req.session.role),
                                //         student: isStu(req.session.role),
                                //         loggedIn: req.session.loggedIn,
                                //         id: req.session.uID,
                                //         wholeName: req.session.wholeName,
                                //         CNR: courseNfaculty,
                                //         CNR2: courseNfaculty2,
                                //         error: true,
                                //         semmy: 'Fall 2021'
                                //     });
                                //     return;
                                // }

                                for (let i = 0; i < result6.length; i++) {
                                    if (result6[i].time_slot_id == result7[0].time_slot_id) {
                                        res.render('home', {
                                            userName: req.session.username,
                                            fac: isFac(req.session.role),
                                            admin: isAdm(req.session.role),
                                            student: isStu(req.session.role),
                                            loggedIn: req.session.loggedIn,
                                            id: req.session.uID,
                                            wholeName: req.session.wholeName,
                                            CNR: courseNfaculty,
                                            CNR2: courseNfaculty2,
                                            timeOverlap: true,
                                            semmy: 'Fall 2021'
                                        });
                                        return;
                                    }
                                }

                                db.query(sqlSeats, (err, result5) => {
                                    if (err) {
                                        console.log(err)
                                        res.render('home', {
                                            userName: req.session.username,
                                            fac: isFac(req.session.role),
                                            admin: isAdm(req.session.role),
                                            student: isStu(req.session.role),
                                            loggedIn: req.session.loggedIn,
                                            id: req.session.uID,
                                            wholeName: req.session.wholeName,
                                            CNR: courseNfaculty,
                                            CNR2: courseNfaculty2,
                                            error: true,
                                            semmy: 'Fall 2021'
                                        });
                                        return;
                                    }

                                    if (result5[0].cnt >= 10) {
                                        res.render('home', {
                                            userName: req.session.username,
                                            fac: isFac(req.session.role),
                                            admin: isAdm(req.session.role),
                                            student: isStu(req.session.role),
                                            loggedIn: req.session.loggedIn,
                                            id: req.session.uID,
                                            wholeName: req.session.wholeName,
                                            CNR: courseNfaculty,
                                            CNR2: courseNfaculty2,
                                            filled: true,
                                            semmy: 'Fall 2021'
                                        });
                                        return;
                                    }

                                    let sqlAF = "SELECT * FROM section WHERE section.section_id = " + secID + " AND section.course_ID = " + cid + ";"

                                    let sqlFin = "INSERT INTO `class_registration` (`section_id`, `student_id`, `midterm_grade`, `final_grade`) VALUES (" + secID + ", " + req.session.uID + ", '_', '_');"

                                    db.query(sqlAF, (err, resInf) => {
                                        if (err) {
                                            console.log(err)
                                            res.render('home', {
                                                userName: req.session.username,
                                                fac: isFac(req.session.role),
                                                admin: isAdm(req.session.role),
                                                student: isStu(req.session.role),
                                                loggedIn: req.session.loggedIn,
                                                id: req.session.uID,
                                                wholeName: req.session.wholeName,
                                                CNR: courseNfaculty,
                                                CNR2: courseNfaculty2,
                                                noClass: true,
                                                semmy: 'Fall 2021'
                                            });
                                            return;
                                        }

                                        if (resInf <= 0) {
                                            res.render('home', {
                                                userName: req.session.username,
                                                fac: isFac(req.session.role),
                                                admin: isAdm(req.session.role),
                                                student: isStu(req.session.role),
                                                loggedIn: req.session.loggedIn,
                                                id: req.session.uID,
                                                wholeName: req.session.wholeName,
                                                CNR: courseNfaculty,
                                                CNR2: courseNfaculty2,
                                                noClass: true,
                                                semmy: 'Fall 2021'
                                            });
                                            return;
                                        }

                                        db.query(sqlFin, (err, result4) => {
                                            if (err) {
                                                console.log(err)
                                                res.render('home', {
                                                    userName: req.session.username,
                                                    fac: isFac(req.session.role),
                                                    admin: isAdm(req.session.role),
                                                    student: isStu(req.session.role),
                                                    loggedIn: req.session.loggedIn,
                                                    id: req.session.uID,
                                                    wholeName: req.session.wholeName,
                                                    CNR: courseNfaculty,
                                                    CNR2: courseNfaculty2,
                                                    noClass: true,
                                                    semmy: 'Fall 2021'
                                                });
                                                return;
                                            }

                                            res.render('home', {
                                                userName: req.session.username,
                                                fac: isFac(req.session.role),
                                                admin: isAdm(req.session.role),
                                                student: isStu(req.session.role),
                                                loggedIn: req.session.loggedIn,
                                                CNR: courseNfaculty,
                                                id: req.session.uID,
                                                wholeName: req.session.wholeName,
                                                CNR2: courseNfaculty2,
                                                regSuc: true,
                                                ClassID: req.body.cID,
                                                semmy: 'Fall 2021'
                                            });
                                            return;
                                        })
                                    })


                                })
                            })
                        })
                    })
                })


            })
        })
    })
})

app.get('/dropClass', (req, res) => {
    if (req.session.role != 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR2: courseNfaculty2,
            cantReg: true,
            semmy: 'Fall 2021'
        });
        return;
    }
    res.render('dropClass');
})

app.post('/dropClass', (req, res) => {
    const secID = "\'" + req.body.secID + "\'";
    let sql = "DELETE FROM `class_registration` WHERE `class_registration`.`section_id` = " + secID + " AND `class_registration`.`student_id` = " + req.session.uID + ";"
    let sql1 = "SELECT * FROM `class_registration` INNER JOIN section ON `class_registration`.section_id = section.section_id WHERE `class_registration`.`section_id` = " + secID + " AND `class_registration`.`student_id` = " + req.session.uID + " AND section.semester_id = 9;"

    db.query(sql1, (err, resso) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                cantDrop: true,
                semmy: 'Fall 2021'
            });
            return;
        }

        if (resso.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                cantDrop: true,
                semmy: 'Fall 2021'
            });
            return;
        }

        db.query(sql, (err, result) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR2: courseNfaculty2,
                    cantDrop: true,
                    semmy: 'Fall 2021'
                });
                return;
            }

            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR2: courseNfaculty2,
                dropSuc: true,
                secID: req.body.secID,
                semmy: 'Fall 2021'
            });
            return;
        })
    })
})



app.get('/showPrereq', (req, res) => {
    res.render('enterCID');
    return
})

app.post('/showPrereq', (req, res) => {

    const id = "\'" + req.body.cID + "\'";
    let sql = "SELECT * FROM prereq INNER JOIN courses ON courses.course_id = prereq.prereq_course_id WHERE prereq.course_id = " + id + ";";
    let cn = "";
    let getName = "SELECT * FROM `courses` WHERE courses.course_id = " + id + ";"

    db.query(getName, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR2: courseNfaculty2,
                error: true,
                semmy: 'Fall 2021'
            });
            return
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR2: courseNfaculty2,
                noPrereq: true,
                semmy: 'Fall 2021'
            });
            return
        }


        cn = result[0].course_title

        db.query(sql, (err, result) => {
            if (err) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR2: courseNfaculty2,
                    error: true,
                    semmy: 'Fall 2021'
                });
                return
            } else {
                db.query(sql, (err, result2) => {
                    if (err) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            CNR: courseNfaculty,
                            CNR2: courseNfaculty2,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            error: true,
                            semmy: 'Fall 2021'
                        });
                        return
                    }

                    if (result.length <= 0) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            CNR: courseNfaculty,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            CNR2: courseNfaculty2,
                            noPrereq: true,
                            semmy: 'Fall 2021'
                        });
                        return
                    }
                    let prereqCourses = []

                    for (let i = 0; i < result.length; i++) {
                        let x = {
                            courseIDNum: result[i].course_id,
                            courseName: result[i].course_title,
                        };
                        prereqCourses.push(x);
                    }

                    res.render('showPrereq', {
                        userData: prereqCourses,
                        courseName: cn,
                        id: req.body.cID
                    })
                    return
                })
            }
        })
    })
})

app.get('/transcript', (req, res) => {
    if (!req.session.loggedIn) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            error: true,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            semmy: 'Fall 2021',
            id: req.session.uID
        });
        return;
    }

    res.render('viewTransEnterID', {
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role)
    })
    return
})

app.post('/transcript', (req, res) => {
    let sql = ""
    let tru_id = ""
    if (req.session.role == 'student') {
        sql = "SELECT * FROM `student_history` INNER JOIN courses ON student_history.course_id = courses.course_id INNER JOIN user on student_history.student_id = user.User_Id WHERE student_history.student_id = " + req.session.uID + ";"
        tru_id = req.session.uID
    } else {
        sql = "SELECT * FROM `student_history` INNER JOIN courses ON student_history.course_id = courses.course_id INNER JOIN user on student_history.student_id = user.User_Id WHERE student_history.student_id = " + req.body.uID + ";"
        tru_id = req.body.uID
    }

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                error: true,
                semmy: 'Fall 2021',
            });
            return
        }

        let sql2 = "SELECT * FROM class_registration INNER JOIN section ON class_registration.section_id = section.section_id INNER JOIN courses ON courses.course_id = section.course_id WHERE class_registration.student_id = " + tru_id + " AND (class_registration.final_grade = 'C' OR class_registration.final_grade = 'C+' OR class_registration.final_grade = 'B-' OR class_registration.final_grade = 'B' OR class_registration.final_grade = 'B+' OR class_registration.final_grade = 'A-' OR class_registration.final_grade = 'A' OR class_registration.final_grade = 'C-' OR class_registration.final_grade = 'D+' OR class_registration.final_grade = 'D' OR class_registration.final_grade = 'D-' OR class_registration.final_grade = 'F');"

        db.query(sql2, (err, result2) => {
            if (err) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    error: true,
                    semmy: 'Fall 2021',
                });
                return
            }
            if (result.length <= 0 && result2.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    noHistory: true,
                    semmy: 'Fall 2021',
                    id: req.session.uID,
                    wholeName: req.session.wholeName
                });
                return
            }

            let data = []
            let gpa = 0
            let credits = 0

            for (let ii = 0; ii < result2.length; ii++) {
                let xi = {
                    c_name: result2[ii].course_title,
                    c_id: result2[ii].course_id,
                    grade: result2[ii].final_grade,
                    semmy: semesterString(result2[ii].semester_id),
                    creds: result2[ii].credits
                }
                credits += result2[ii].credits
                gpa += calcGpa(result2[ii].grade) * result2[ii].credits
                data.push(xi)
            }

            for (let i = 0; i < result.length; i++) {
                let x = {
                    c_name: result[i].course_title,
                    c_id: result[i].course_id,
                    grade: result[i].grade,
                    semmy: semesterString(result[i].semester_id),
                    creds: result[i].credits
                }
                credits += result[i].credits
                gpa += calcGpa(result[i].grade) * result[i].credits
                data.push(x)
            }



            res.render('showTranscript', {
                s_name: result[0].First_Name + " " + result[0].Last_Name,
                id: tru_id,
                classData: data,
                gpaT: Math.round(((gpa / credits) + Number.EPSILON) * 100) / 100
            })
            return

        })
    })
})

function semesterString(Semmy) {
    if (Semmy == '1') {
        return 'Fall 2021'
    }
    if (Semmy == '2') {
        return 'Spring 2018'
    }
    if (Semmy == '3') {
        return 'Fall 2018'
    }
    if (Semmy == '4') {
        return 'Spring 2019'
    }
    if (Semmy == '5') {
        return 'Fall 2019'
    }
    if (Semmy == '6') {
        return 'Spring 2020'
    }
    if (Semmy == '7') {
        return 'Fall 2020'
    }
    if (Semmy == '8') {
        return 'Spring 2021'
    }
    if (Semmy == '9') {
        return 'Spring 2022'
    }
}

function calcGpa(grade) {
    if (grade == 'A') {
        return 4.0
    } else if (grade == 'A-') {
        return 3.7
    } else if (grade == 'B+') {
        return 3.3
    } else if (grade == 'B') {
        return 3.00
    } else if (grade == 'B-') {
        return 2.7
    } else if (grade == 'C+') {
        return 2.3
    } else if (grade == 'C') {
        return 2.00
    } else if (grade == 'C-') {
        return 1.7
    } else if (grade == 'D+') {
        return 1.3
    } else if (grade == 'D') {
        return 1.00
    } else if (grade == 'D-') {
        return .7
    } else if (grade == 'F') {
        return 0
    } else {
        return 0
    }
}

app.get('/degreeAudit', (req, res) => {
    if (req.session.loggedIn != true) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            error: true,
            semmy: 'Fall 2021'
        });
        return
    }

    res.render('degreeInfo', {
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role)
    });
    return
})

app.post('/degreeAudit', (req, res) => {
    if (req.session.loggedIn != true) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            error: true,
            semmy: 'Fall 2021'
        });
        return
    }

    if ((req.body.major == 0 && req.body.minor == 0)) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR2: courseNfaculty2,
            error: true,
            semmy: 'Fall 2021'
        });
        return
    }

    let sql = ""
    let sqlNames = ""
    let neededToGrad = 120
    if (req.body.minor == undefined) {
        sql = "SELECT * FROM major_requirements INNER JOIN courses ON major_requirements.req_course_id = courses.course_id WHERE major_requirements.major_id = " + req.body.major + ";"
        sqlNames = "SELECT * FROM `major` WHERE `major_id` = " + req.body.major + ";"
    } else {
        sql = "SELECT * FROM major_requirements INNER JOIN courses ON major_requirements.req_course_id = courses.course_id WHERE major_requirements.major_id = " + req.body.major + " UNION SELECT * FROM minor_requirements INNER JOIN courses ON minor_requirements.req_course_id = courses.course_id WHERE minor_requirements.minor_id = " + req.body.minor + ";"
        sqlNames = "SELECT * FROM `major` WHERE `major_id` = " + req.body.major + " UNION SELECT * FROM minor WHERE minor.minor_id = " + req.body.minor + ";"
    }
    if (false) {
        sql = "SELECT * FROM `grad_program_requirements` INNER JOIN courses ON grad_program_requirements.course_id = courses.course_id WHERE `grad_program_id` = " + req.body.gradProg + ";"
        neededToGrad = 60
    }

    db.query(sqlNames, (err, resultto) => {
        if (err || resultto.length <= 0) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                error: true,
                semmy: 'Fall 2021'
            });
            return
        }

        mName = ""
        mNName = "None"
        for (let i = 0; i < resultto.length; i++) {
            if (i == 0) {
                mName = resultto[i].major_title
            } else {
                mNName = resultto[i].major_title
            }
        }

        db.query(sql, (err, result) => {
            if (err || result.length <= 0) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    error: true,
                    semmy: 'Fall 2021'
                });
                return
            }

            let classesReq = []
            let classesToTa = []
            let mapR = []
            let mapT = []
            //let mapR = new Map();
            //let mapT = new Map();

            for (let i = 0; i < result.length; i++) {
                let x = {
                    c_name: result[i].course_title,
                    c_id: result[i].course_id,
                    credits: result[i].credits
                }
                classesReq.push(result[i].course_id)
                mapR.push(x)
            }




            let truID = ""
            if (req.session.role != 'student') {
                truID = req.body.uID
            } else {
                truID = req.session.uID
            }

            let sqlTook = "SELECT * FROM `student_history` INNER JOIN user ON `student_history`.student_id = user.User_Id INNER JOIN courses ON courses.course_id = student_history.course_id WHERE `student_id` = " + truID + " AND (student_history.grade LIKE 'C' OR student_history.grade LIKE 'C+' OR student_history.grade LIKE 'B-' OR student_history.grade LIKE 'B' OR student_history.grade LIKE 'B+' OR student_history.grade LIKE 'A-' OR student_history.grade LIKE 'A') AND student_history.grade NOT LIKE 'C-';"
            db.query(sqlTook, (err, result1) => {
                if (err || result1.length <= 0) {
                    console.log(err)
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        CNR2: courseNfaculty2,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        cantDA: true,
                        semmy: 'Fall 2021'
                    });
                    return
                }

                if (result1.length <= 0) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        CNR2: courseNfaculty2,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        noHist: true,
                        semmy: 'Fall 2021'
                    });
                    return
                }

                for (let ii = 0; ii < result1.length; ii++) {
                    let x = {
                        c_name: result1[ii].course_title,
                        c_id: result1[ii].course_id,
                        credits: result1[ii].credits
                    }
                    classesToTa.push(result1[ii].course_id)
                    mapT.push(x)
                }


                let sqlTaking = "SELECT * FROM `class_registration` INNER JOIN section ON class_registration.section_id = section.section_id INNER JOIN courses ON courses.course_id = section.course_id WHERE `student_id`= " + truID + ";"

                db.query(sqlTaking, (err, result2) => {
                    if (err) {
                        console.log(err)
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            CNR: courseNfaculty,
                            CNR2: courseNfaculty2,
                            error: true,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            semmy: 'Fall 2021'
                        });
                        return
                    }

                    for (let j = 0; j < result2.length; j++) {
                        let x = {
                            c_name: result2[j].course_title,
                            c_id: result2[j].course_id,
                            credits: result2[j].credits
                        }
                        classesToTa.push(result2[j].course_id)
                        mapT.push(x)
                    }

                    let res2 = mapR.filter(ar => !mapT.find(rm => (rm.c_id === ar.c_id)))

                    credz = 0;
                    mapT.forEach(e => {
                        credz += e.credits
                    })

                    res.render('viewDegreeAudit', {
                        sName: result1[0].First_Name + " " + result1[0].Last_Name,
                        min: mNName,
                        maj: mName,
                        id: truID,
                        credits: credz,
                        class: classLev(credz),
                        req: neededToGrad,
                        taken: mapT,
                        needed: res2
                    })
                    return
                })
                return
            })

        })
    })
    return
})

function classLev(credits) {
    if (credits <= 30) {
        return "Freshman"
    } else if (credits > 30 && credits <= 60) {
        return "Sophmore"
    } else if (credits > 60 && credits <= 90) {
        return "Junior"
    } else {
        return "Senior"
    }
}

app.get('/setGrades', (req, res) => {
    if (req.session.role == 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            id: req.session.uID,
            wholeName: req.session.wholeName,
            CNR2: courseNfaculty2,
            error: true,
            semmy: 'Fall 2021'
        });
        return
    }
    res.render('enterGrade')
})

app.post('/setGrade', (req, res) => {
    const uid = "\'" + req.body.uID + "\'";
    const cid = "\'" + req.body.cID + "\'";
    const grade = "\'" + req.body.grade + "\'";
    let sql = "SELECT * FROM `section` WHERE `section_id` = " + cid + ";"
    let sql2 = "UPDATE `class_registration` SET `final_grade` = " + grade + " WHERE `class_registration`.`section_id` = " + cid + " AND `class_registration`.`student_id` = " + uid + ";";

    let dumb = "SELECT * FROM user WHERE User_Id = " + uid + ";"

    db.query(dumb, (err, ress2) => {
        if (err || ress2.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                CNR2: courseNfaculty2,
                noStudent: true,
                semmy: 'Fall 2021'
            });
            return
        }

        let sqlWrongT = "SELECT * FROM section INNER JOIN class_registration ON class_registration.section_id = section.section_id WHERE section.faculty_id = "+req.session.uID +" AND class_registration.student_id = " + uid + " AND section.semester_id = 1 AND section.section_id = " + cid + ";"

        db.query(sqlWrongT, (err, ressyy)=>{
            if (err || ressyy.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    CNR2: courseNfaculty2,
                    cantChange: true,
                    semmy: 'Fall 2021'
                });
                return
            }

            db.query(sql, (err, ress) => {
                if (err || ress.length <= 0) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR2: courseNfaculty2,
                        noClass: true,
                        semmy: 'Fall 2021'
                    });
                    return
                } else if (ress[0].faculty_id != req.session.uID) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        CNR2: courseNfaculty2,
                        cantChange: true,
                        semmy: 'Fall 2021'
                    });
                    return
                }

                let sql3 = "SELECT * FROM `student_history` WHERE `course_id` = " + cid + " AND student_id = " + uid + ";"


                if (isDateAfterToday()) {
                    console.log("AFTER")
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR2: courseNfaculty2,
                        cantGrade: true,
                        semmy: 'Fall 2021'
                    });
                    return
                }

                if (isDateBeforeToday()) {
                    console.log("before")
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        loggedIn: req.session.loggedIn,
                        CNR: courseNfaculty,
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        CNR2: courseNfaculty2,
                        cantGrade: true,
                        semmy: 'Fall 2021'
                    });
                    return
                }

                db.query(sql3, (err, result2) => {
                    if (err) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            CNR: courseNfaculty,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            CNR2: courseNfaculty2,
                            error: true,
                            semmy: 'Fall 2021'
                        });
                        return
                    }
                    db.query(sql2, (err, result) => {
                        if (err) {
                            console.log(err)
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                CNR: courseNfaculty,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                CNR2: courseNfaculty2,
                                error: true,
                                semmy: 'Fall 2021'
                            });
                            return
                        }
                        let sql4 = ""

                        if (result2.length <= 0) {
                            sql4 = "UPDATE `student_history` SET `student_id` = " + uid + ", `course_id`= '" + ress[0].course_id + "', `semester_id` = 1, `grade` = " + grade + " WHERE student_id=" + uid + " AND course_id= '" + ress[0].course_id + "';"
                        } else {
                            sql4 = "INSERT INTO `student_history`(`student_id`, `course_id`, `semester_id`, `grade`) VALUES (" + uid + ", '" + ress[0].course_id + "', " + 1 + ", " + grade + ")"
                        }

                        db.query(sql4, (err, ross) => {
                            if (err) {
                                console.log(err)
                                res.render('home', {
                                    userName: req.session.username,
                                    fac: isFac(req.session.role),
                                    admin: isAdm(req.session.role),
                                    student: isStu(req.session.role),
                                    loggedIn: req.session.loggedIn,
                                    CNR: courseNfaculty,
                                    id: req.session.uID,
                                    wholeName: req.session.wholeName,
                                    CNR2: courseNfaculty2,
                                    error: true,
                                    semmy: 'Fall 2021'
                                });
                                return
                            }
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                CNR: courseNfaculty,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                CNR2: courseNfaculty2,
                                changed: true,
                                semmy: 'Fall 2021',
                                swID: uid
                            });
                            return
                        })
                    })
                })
            })

        })
            
    })
})

function isDateBeforeToday() {
    return new Date() > '2021-12-24';
}

function isDateAfterToday() {
    return new Date() < '2021-12-14';
}

app.get('/viewClassList', (req, res) => {
    if (req.session.role == 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            id: req.session.uID,
            error: true,
            wholeName: req.session.wholeName,
            semmy: 'Fall 2021'
        });
        return
    }
    let sql = "SELECT * FROM section INNER JOIN class_registration ON class_registration.section_id = section.section_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN user ON section.faculty_id = user.User_Id WHERE section.semester_id = 1 AND user.User_Id = " + req.session.uID + ";"

    let sql2 = "SELECT * FROM user WHERE user.Role = 'student' AND user.User_Id IN (SELECT student_id FROM section INNER JOIN class_registration ON class_registration.section_id = section.section_id INNER JOIN courses ON courses.course_id = section.course_id INNER JOIN user ON section.faculty_id = user.User_Id WHERE section.semester_id = 1 AND user.User_Id = " + req.session.uID + ")"
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                CNR: courseNfaculty,
                CNR2: courseNfaculty2,
                error: true,
                wholeName: req.session.wholeName,
                semmy: 'Fall 2021'
            });
            return
        }

        if (result <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                id: req.session.uID,
                CNR2: courseNfaculty2,
                noStudents: true,
                wholeName: req.session.wholeName,
                semmy: 'Fall 2021'
            });
            return
        }

        db.query(sql2, (err, result2) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    error: true,
                    wholeName: req.session.wholeName,
                    semmy: 'Fall 2021'
                });
                return
            }
            infoS = []
            let p_name = result[0].First_Name + " " + result[0].Last_Name
            for (let i = 0; i < result.length; i++) {
                let x = {
                    c_id: result[i].course_id,
                    c_name: result[i].course_title,
                    sec_id: result[i].section_id,
                    student_id: result[i].student_id,
                    grade: getGrade(result[i].final_grade),
                    s_name: result2[i].First_Name + " " + result2[i].Last_Name,
                    mail: result2[i].Email
                }
                infoS.push(x)
            }

            res.render('classList', {
                name: p_name,
                info: infoS
            })
        })
    })
})

function getGrade(grade) {
    if (grade == null) {
        return "None"
    }
    return grade
}

app.get('/removeStudent', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('removeStudent');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty
        });
        return
    }
})

// app.post('/removeStudent', (req, res) => {
//     const u_id = "\'" + req.body.u_id + "\'";
//     let sql = "DELETE FROM user WHERE User_Id = "+ u_id + "";

//     db.query(sql, (err, result) => {
//         console.log(err)
//         if (err) {
//             res.render('home', {
//                 userName: req.session.username,
//                 fac: isFac(req.session.role),
//                 admin: isAdm(req.session.role),
//                 student: isStu(req.session.role),
//                 loggedIn: req.session.loggedIn,
//                 failedToAddCourse: true,
//                 CNR: courseNfaculty,
//                 uID: u_id,
//                 failedRemovingStudent: true
//             });
//             return;
//         }

//         res.render('home', {
//             userName: req.session.username,
//             fac: isFac(req.session.role),
//             admin: isAdm(req.session.role),
//             student: isStu(req.session.role),
//             loggedIn: req.session.loggedIn,
//             failedToAddCourse: false,
//             CNR: courseNfaculty,
//             uID: u_id,
//             removingStudent: true
//         });
//         return;
//     })

// })

app.get('/removeSection', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('removeSection');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty
        });
        return
    }
})

app.post('/removeSection', (req, res) => {
    const s_id = "\'" + req.body.s_id + "\'";
    let sql = "DELETE FROM section WHERE section_id = " + s_id + "";

    db.query(sql, (err, result) => {
        console.log(err)
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                sectionID: s_id,
                removingSection: true,
                id: req.session.uID,
                wholeName: req.session.wholeName,
                failedToRemoveSection: true
            });
            return;
        }

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            CNR: courseNfaculty,
            sectionID: s_id,
            removingSection: true,
            wholeName: req.session.wholeName,
            failedToRemoveSection: false
        });
        return;
    })

})


app.get('/showProgram', (req, res) => {
    res.render('programUID', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})

app.post('/showProgram', (req, res) => {
    let id = "\'" + req.body.uID + "\'";
    const grad_type = "\'" + req.body.grad_type + "\'";
    const role = "\'" + req.body.role + "\'";
    if (req.session.role == 'student') {
        id = req.session.uID
    }

    if (id != req.session.uID && req.session.email != 'admin@jajuniversity.com' && req.session.role != 'faculty') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            wholeName: req.session.wholeName,
            cantView: true
        });
        return;
    } else {

        let sql = "";
        // let sql2 = "";
        if (true) {
            sql = "SELECT * FROM major INNER JOIN student_major ON major.major_id = student_major.major_id INNER JOIN student ON student.student_id = student_major.student_id INNER JOIN user ON user.User_Id = student.student_id WHERE student.student_id =" + id + " UNION SELECT * FROM minor INNER JOIN student_minor ON minor.minor_id =student_minor.minor_id INNER JOIN student ON student.student_id = student_minor.student_id INNER JOIN user ON user.User_Id = student.student_id WHERE student.student_id = " + id + "; ";
            // sql = "    SELECT * FROM student_major INNER JOIN major ON major.major_id = student_major.major_id WHERE student_major.student_id = "+id+";";
            // sql = "SELECT * FROM major INNER JOIN student_major ON major.major_id = student_major.major_id INNER JOIN student ON student.student_id = student_major.student_id WHERE student.student_id ="+id+" " + " SELECT * FROM minor INNER JOIN student_minor ON minor.minor_id =student_minor.minor_id INNER JOIN student ON student.student_id = student_minor.student_id WHERE student.student_id = "+id+"; ";
            // sql = "SELECT * FROM student_minor INNER JOIN minor ON minor.minor_id = student_minor.minor_id WHERE student_minor.student_id = "+id+";";
            //sql2 = "SELECT * FROM student_major INNER JOIN major ON major.major_id = student_major.major_id WHERE student_major.student_id = "+id+";";
        } else {

            sql = "SELECT * FROM grad_program INNER JOIN grad_registration ON grad_program.grad_program_id = grad_registration.grad_program_id INNER JOIN user ON user.User_Id = grad_registration.student_id WHERE grad_registration.student_id =" + id + ";";

        }
        db.query(sql, (err, result) => {
            if (err) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    id: req.session.uID,
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    wholeName: req.session.wholeName,
                    error: true
                });
                return;
            } else if (result.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    wholeName: req.session.wholeName,
                    error: true
                });
                return
            } else {
                db.query(sql, (err, result2) => {
                    if (err) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            id: req.session.uID,
                            CNR: courseNfaculty,
                            wholeName: req.session.wholeName,
                            error: true
                        });
                        return
                    }
                    if (result.length <= 0) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            id: req.session.uID,
                            loggedIn: req.session.loggedIn,
                            wholeName: req.session.wholeName,
                            CNR: courseNfaculty
                        });
                        return
                    }
                    let programViewer = []

                    for (let i = 0; i < result.length; i++) {
                        let x = {
                            majorIDNum: result[i].major_id,
                            minorIDNum: result[i].minor_id,
                            gradIDNum: result[i].grad_program_id,
                            majorName: result[i].major_title,
                            minorName: result[i].minor_title,
                            gradName: result[i].grad_program_title,
                        };
                        programViewer.push(x);
                    }

                    res.render('showProgram', {
                        userData: programViewer,
                        name: result[0].First_Name + " " + result[0].Last_Name,
                        id: id
                    })
                })
            }

        })
    }
})

app.get('/viewHolds', (req, res) => {
    if (req.session.loggedIn === true) {
        res.render('enterHoldID', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
        })
    } else {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            error: true,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty
        });
        return
    }
})

app.post('/viewHolds', (req, res) => {
    let truID = ""
    if (req.session.role != 'student') {
        truID = req.body.uID
    } else {
        truID = req.session.uID
    }

    let sql = "SELECT * FROM student_holds INNER JOIN user ON student_holds.student_id = user.User_Id WHERE student_holds.student_id = " + truID + ";"

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                wholeName: req.session.wholeName,
                error: true
            });
            return
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                CNR: courseNfaculty,
                wholeName: req.session.wholeName,
                id: req.session.uID,
                noHolds: true
            });
            return
        }

        let hViewer = []
        for (let i = 0; i < result.length; i++) {
            let x = {
                sID: result[i].student_id,
                type: result[i].hold_type
            };
            hViewer.push(x);
        }

        res.render('viewHolds', {
            hv: hViewer,
            id: truID,
            name: result[0].First_Name + " " + result[0].Last_Name
        })
        return
    })
})

app.get('/showProgram', (req, res) => {
    res.render('programUID', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})
app.post('/showProgram', (req, res) => {
    let id = "\'" + req.body.uID + "\'";
    const grad_type = "\'" + req.body.grad_type + "\'";
    const role = "\'" + req.body.role + "\'";
    if (req.session.role == 'student') {
        id = req.session.uID
    }

    if (id != req.session.uID && req.session.email != 'admin@jajuniversity.com' && req.session.role != 'faculty') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            wholeName: req.session.wholeName,
            cantView: true
        });
        return;
    } else {

        let sql = "";

        if (req.body.grad_type == 'undergrad') {
            sql = "SELECT * FROM major INNER JOIN student_major ON major.major_id = student_major.major_id INNER JOIN student ON student.student_id = student_major.student_id INNER JOIN user ON user.User_Id = student.student_id WHERE student.student_id =" + id + " UNION SELECT * FROM minor INNER JOIN student_minor ON minor.minor_id =student_minor.minor_id INNER JOIN student ON student.student_id = student_minor.student_id INNER JOIN user ON user.User_Id = student.student_id WHERE student.student_id = " + id + "; ";
            // sql = "    SELECT * FROM student_major INNER JOIN major ON major.major_id = student_major.major_id WHERE student_major.student_id = "+id+";";
            // sql = "SELECT * FROM major INNER JOIN student_major ON major.major_id = student_major.major_id INNER JOIN student ON student.student_id = student_major.student_id WHERE student.student_id ="+id+" " + " SELECT * FROM minor INNER JOIN student_minor ON minor.minor_id =student_minor.minor_id INNER JOIN student ON student.student_id = student_minor.student_id WHERE student.student_id = "+id+"; ";
            // sql = "SELECT * FROM student_minor INNER JOIN minor ON minor.minor_id = student_minor.minor_id WHERE student_minor.student_id = "+id+";";
            //sql2 = "SELECT * FROM student_major INNER JOIN major ON major.major_id = student_major.major_id WHERE student_major.student_id = "+id+";";

        } else {
            sql = "SELECT * FROM grad_program INNER JOIN grad_registration ON grad_program.grad_program_id = grad_registration.grad_program_id INNER JOIN user ON user.User_Id = grad_registration.student_id WHERE grad_registration.student_id =" + id + ";";
        }
        db.query(sql, (err, result) => {
            if (err) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    wholeName: req.session.wholeName,
                    wrongcred: true
                });
                return;
            }


            if (result.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    CNR: courseNfaculty,
                    CNR2: courseNfaculty2,
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    wrongcred: true
                });
                return;
            }

            let programViewer = []

            for (let i = 0; i < result.length; i++) {
                let x = {
                    majorIDNum: result[i].major_id,
                    minorIDNum: result[i].minor_id,
                    gradIDNum: result[i].grad_program_id,
                    majorName: result[i].major_title,
                    minorName: result[i].minor_title,
                    gradName: result[i].grad_program_title,
                };
                programViewer.push(x);
            }

            res.render('showProgram', {
                userData: programViewer,
                name: result[0].First_Name + " " + result[0].Last_Name,
                id: req.body.uID
            })
        })
    }
})

app.get('/removeStudent', (req, res) => {
    if (req.session.loggedIn === true && req.session.email === 'admin@jajuniversity.com') {
        res.render('removeStudent');
    } else {
        isDenied = true;
        res.render('home', {
            denied: isDenied,
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            id: req.session.uID,
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            failed: failedLogin,
            wholeName: req.session.wholeName,
            CNR: courseNfaculty
        });
        return
    }
})

app.post('/removeStudent', (req, res) => {
    const u_id = "\'" + req.body.u_id + "\'";

    let sql = "DELETE FROM user WHERE User_Id = " + u_id + "";

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                loggedIn: req.session.loggedIn,
                id: req.session.uID,
                removingStudent: true,
                CNR: courseNfaculty,
                uID: u_id,
                wholeName: req.session.wholeName,
                failedRemovingStudent: true
            });
            return;
        }

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            failedRemovingStudent: false,
            CNR: courseNfaculty,
            uID: u_id,
            wholeName: req.session.wholeName,
            removingStudent: true
        });
        return;
    })

})

app.get('/viewMajorPrograms', (req, res) => {
    res.render('inputMajor', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})
app.post('/viewMajorPrograms', (req, res) => {
    let major = "\'" + req.body.major_type + "\'";

    if (req.body.major_type == 0) {
        res.render('inputMajor', {});
        return;
    } else {
        let sql = " SELECT * FROM major_requirements INNER JOIN major ON major_requirements.major_id = major.major_id INNER JOIN courses ON courses.course_id = major_requirements.req_course_id WHERE major_requirements.major_id = " + major + "";

        db.query(sql, (err, result) => {
            if (err) {
                res.render('inputMajor', {});
                return;
            }
            let attendanceViewer = []

            for (let i = 0; i < result.length; i++) {
                let x = {
                    courseName: result[i].course_title,
                    courseID: result[i].course_id,
                };
                attendanceViewer.push(x);
            }

            res.render('viewMajorPrograms', {
                userData: attendanceViewer,
                programName: result[0].major_title,

            })
        })
    }
})

app.get('/viewMinorPrograms', (req, res) => {
    res.render('inputMinor', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})

app.post('/viewMinorPrograms', (req, res) => {
    let minor = "\'" + req.body.minor_type + "\'";

    console.log(minor)

    if (req.body.minor_type == 0) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            loggedIn: req.session.loggedIn,
            id: req.session.uID,
            CNR: courseNfaculty,
            wholeName: req.session.wholeName,
            error: true
        });
        return;
    } else {
        let sql = " SELECT * FROM minor_requirements INNER JOIN minor ON minor_requirements.minor_id = minor.minor_id INNER JOIN courses ON courses.course_id = minor_requirements.req_course_id WHERE minor_requirements.minor_id = " + minor + "";

        db.query(sql, (err, result) => {
            if (err) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    CNR: courseNfaculty,
                    wholeName: req.session.wholeName,
                    error: true
                });
                return;
            }

            if (result <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    loggedIn: req.session.loggedIn,
                    id: req.session.uID,
                    CNR: courseNfaculty,
                    wholeName: req.session.wholeName,
                    error: true
                });
                return;
            }

            let attendanceViewer = []

            for (let i = 0; i < result.length; i++) {
                let x = {
                    courseID: result[i].course_id,
                    courseName: result[i].course_title
                };
                attendanceViewer.push(x);
            }

            res.render('viewMinorPrograms', {
                userData: attendanceViewer,
                programName: result[0].minor_title
            })

        })

    }
})

app.get('/viewGradPrograms', (req, res) => {
    res.render('inputGrad', {
        uID: req.session.uID,
        fac: isFac(req.session.role),
        admin: isAdm(req.session.role),
        student: isStu(req.session.role),
        email: req.session.email
    });
    return;
})
app.post('/viewGradPrograms', (req, res) => {
    let grad_type = "\'" + req.body.grad + "\'";

    if (req.body.grad == 0) {
        res.render('inputGrad', {});
        return;
    } else {
        let sql = " SELECT * FROM grad_program_requirements INNER JOIN grad_program ON grad_program_requirements.grad_program_id = grad_program.grad_program_id INNER JOIN courses ON courses.course_id = grad_program_requirements.course_id WHERE grad_program_requirements.grad_program_id = " + grad_type + "";

        db.query(sql, (err, result) => {
            if (err) {
                res.render('inputGrad', {});
                return;
            }
            let attendanceViewer = []

            for (let i = 0; i < result.length; i++) {
                let x = {
                    courseId: result[i].course_id,
                    courseName: result[i].course_title,
                };
                attendanceViewer.push(x);
            }

            res.render('viewGradPrograms', {
                userData: attendanceViewer,
                programName: result[0].grad_program_title,
            })
        })
    }
})

app.get('/editInstructor', (req, res) => {
    if (req.session.role != 'admin') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            denied: true
            //CNR2: courseNfaculty2
        });
        return;
    }

    res.render('enterInstructorChange')
    return
})

app.post('/editInstructor', (req, res) => {
    if (req.session.role != 'admin') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            denied: true
        });
        return;
    }

    let sql2 = "SELECT * FROM section WHERE section.section_id = " + req.body.cID + " AND section.semester_id = 9;"

    db.query(sql2, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                noClass: true
            });
            return;
        }

        res.render('editCourseInfo', {
            sec_id: result[0].section_id,
            c_id: result[0].course_id,
            fac_id: result[0].faculty_id,
            room_id: result[0].room_id,
            ts: result[0].time_slot_id,
            cap: result[0].capacity
        })
        return
    })
})

app.post('/editClass', (req, res) => {

    const sec_id = "\'" + req.body.sec_id + "\'";
    const c_id = "\'" + req.body.course_id + "\'";
    const uid = "\'" + req.body.fac_id + "\'";
    const room_id = "\'" + req.body.room_id + "\'";
    const ts = "\'" + req.body.time_slot + "\'";
    const cap = "\'" + req.body.cap + "\'";

    let sql1 = "SELECT * FROM `section` WHERE `section_id`=" + sec_id + ";"
    let sql = "SELECT * FROM section WHERE faculty_id = " + uid + " AND semester_id = 9 AND section_id <> " + sec_id + ";"
    let sqlClasses = "SELECT *, COUNT(*) AS cnt FROM section WHERE faculty_id = " + uid + " AND semester_id = 9"

    db.query(sqlClasses, (err, resulo) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
                //CNR2: courseNfaculty2
            });
            return;
        }

        if (resulo.length > 0) {
            if (resulo[0].cnt > 3) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    tooManyClasses: true
                    //CNR2: courseNfaculty2
                });
                return;
            }
        }
        db.query(sql1, (err, result) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    error: true
                    //CNR2: courseNfaculty2
                });
                return;
            }
            if (result.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    noClassWCRN: true
                    //CNR2: courseNfaculty2
                });
                return;
            }

            let time = result[0].time_slot_id

            db.query(sql, (err, result1) => {
                if (err) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        loggedIn: nullCheck(req.session.uID),
                        CNR: courseNfaculty,
                        error: true
                        //CNR2: courseNfaculty2
                    });
                    return;
                }

                for (let i = 0; i < result1.length; i++) {
                    if (result1[i].time_slot_id == time) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            loggedIn: nullCheck(req.session.uID),
                            CNR: courseNfaculty,
                            timeOverlap: true
                            //CNR2: courseNfaculty2
                        });
                        return;
                    }
                }

                let checkTime = "SELECT * FROM `section` WHERE `room_id`= " + room_id + " AND `time_slot_id` = " + result[0].time_slot_id + " AND `semester_id` = 9 AND `section_id` <> " + sec_id + ";"

                db.query(checkTime, (err, resu) => {
                    if (err || resu.length > 0) {
                        res.render('home', {
                            userName: req.session.username,
                            fac: isFac(req.session.role),
                            admin: isAdm(req.session.role),
                            student: isStu(req.session.role),
                            loggedIn: req.session.loggedIn,
                            failedToAddClass: true,
                            CNR: courseNfaculty,
                            addingClass: true,
                            id: req.session.uID,
                            wholeName: req.session.wholeName,
                            semmy: 'Fall 2021'
                        });
                        return;
                    }

                    let checkFac = "SELECT * FROM `section` WHERE `faculty_id` = " + uid + " AND semester_id = 9 AND time_slot_id = " + ts + " AND `section_id` <> " + sec_id + ";"

                    db.query(checkFac, (err, result11) => {
                        if (err) {
                            console.log(err)
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                failedToAddClass: true,
                                CNR: courseNfaculty,
                                addingClass: true,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                semmy: 'Fall 2021'
                            });
                            return;
                        }

                        if (result11.length > 0) {
                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                loggedIn: req.session.loggedIn,
                                timeOverlap: true,
                                CNR: courseNfaculty,
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                semmy: 'Fall 2021'
                            });
                            return;
                        }

                        let sql2 = "UPDATE `section` SET `faculty_id`= " + uid + ", `course_id`=" + c_id + ", `room_id`= " + room_id + ", `capacity` = " + cap + " WHERE section_id = " + sec_id + ";"
                        db.query(sql2, (err, res3) => {
                            if (err) {
                                res.render('home', {
                                    userName: req.session.username,
                                    fac: isFac(req.session.role),
                                    admin: isAdm(req.session.role),
                                    student: isStu(req.session.role),
                                    id: req.session.uID,
                                    wholeName: req.session.wholeName,
                                    loggedIn: nullCheck(req.session.uID),
                                    CNR: courseNfaculty,
                                    error: true
                                });
                                return;
                            }

                            res.render('home', {
                                userName: req.session.username,
                                fac: isFac(req.session.role),
                                admin: isAdm(req.session.role),
                                student: isStu(req.session.role),
                                id: req.session.uID,
                                wholeName: req.session.wholeName,
                                loggedIn: nullCheck(req.session.uID),
                                CNR: courseNfaculty,
                                editClass: true
                            });
                            return;

                        })
                    })


                })
            })
        })
    })
})

app.get('/changeMinor', (req, res) => {
    if (req.session.role != 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return;
    }

    res.render('selectNewMinor')
})

app.post('/changeMinor', (req, res) => {
    let sql = "SELECT * FROM `student_minor` WHERE `student_id` = " + req.session.uID + ";"
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        let sql2 = ""
        if (result.length > 0) {
            sql2 = "UPDATE `student_minor` SET `student_id`=" + req.session.uID + ",`minor_id`=" + req.body.minor_type + " WHERE student_id = " + req.session.uID + ";"
        } else {
            sql2 = "INSERT INTO `student_minor`(`student_id`, `minor_id`) VALUES (" + req.session.uID + "," + req.body.minor_type + ")"
        }

        db.query(sql2, (err, result2) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    error: true
                });
                return;
            }

            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                updatedMinor: true
            });
            return;
        })
    })
})

app.get('/changeMajor', (req, res) => {
    if (req.session.role != 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return;
    }

    res.render('selectNewMajor')
})

app.post('/changeMajor', (req, res) => {
    let sql = "SELECT * FROM `student_major` WHERE `student_id` = " + req.session.uID + ";"
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        let sql2 = ""
        if (result.length > 0) {
            sql2 = "UPDATE `student_major` SET `student_id`=" + req.session.uID + ",`major_id`=" + req.body.major_type + " WHERE student_id = " + req.session.uID + ";"
        } else {
            sql2 = "INSERT INTO `student_major`(`student_id`, `major_id`) VALUES (" + req.session.uID + "," + req.body.major_type + ")"
        }

        db.query(sql2, (err, result2) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    error: true
                });
                return;
            }

            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                updatedMajor: true
            });
            return;
        })
    })
})

app.get('/viewMyInfo', (req, res) => {
    if (req.session.role != 'student') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return;
    }
    let sql = "SELECT * FROM user WHERE user.User_Id = " + req.session.uID + ";"

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return
        }


        res.render('userInfo', {
            name: result[0].First_Name + " " + result[0].Last_Name,
            id: result[0].User_Id,
            email: result[0].Email,
            number: result[0].Phone,
            type: result[0].Role
        })
        return
    })
})

app.get('/viewInfo', (req, res) => {
    if (!(req.session.role == 'faculty' || req.session.role == 'admin')) {
        console.log(req.session.role == 'admin')
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return
    }

    res.render('enterIDViewInfo');
    return
})

app.post('/viewUserInfo', (req, res) => {
    let sql = "SELECT * FROM user WHERE user.User_Id = " + req.body.uID + ";"

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                noUser: true
            });
            return
        }

        res.render('userInfo', {
            name: result[0].First_Name + " " + result[0].Last_Name,
            id: result[0].User_Id,
            email: result[0].Email,
            number: result[0].Phone,
            type: result[0].Role
        })
        return
    })
})

app.get('/editUser', (req, res) => {
    if (!(req.session.role == 'admin' && req.session.email == 'admin@jajuniversity.com')) {
        console.log(req.session.role)
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return
    }

    res.render('enterUserToEdit')
    return
})

app.post('/editUserInfo', (req, res) => {
    let sql = "SELECT * FROM user WHERE user.User_Id = " + req.body.uID + ";"

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                noUser: true
            });
            return
        }

        res.render('editUserInfo', {
            f_name: result[0].First_Name,
            l_name: result[0].Last_Name,
            id: result[0].User_Id,
            email: result[0].Email,
            number: result[0].Phone
        })
        return
    })
})

app.post('/editUser', (req, res) => {
    let sql = "UPDATE `user` SET `Email`= '" + req.body.email + "',`First_Name`='" + req.body.f_name + "',`Last_Name`='" + req.body.l_name + "',`Phone`='" + req.body.number + "' WHERE User_Id = " + req.body.id + ";"
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return
        }

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            editedUser: true,
            usersID: req.body.id
        });
        return
    })
})

app.get('/addHold', (req, res) => {
    if (req.session.role != 'admin') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            denied: true
        });
        return;
    }

    res.render('addHold')
    return
})

app.get('/removeHold', (req, res) => {
    if (req.session.role != 'admin') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            denied: true
        });
        return;
    }

    res.render('removeHold')
    return
})

app.post('/removeHold', (req, res) => {

    let sql = "SELECT * FROM `student_holds` WHERE student_id = " + req.body.uID + " AND hold_type = '" + req.body.holdType + "';"
    db.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                noHolds: true
            });
            return;
        }


        let sql2 = "DELETE FROM `student_holds` WHERE `student_id` = " + req.body.uID + " AND `hold_type` = '" + req.body.holdType + "';"

        db.query(sql2, (err, resulti) => {
            if (err) {
                console.log(err)
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    error: true
                });
                return;
            }
        })

        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            removedHold: true,
            ht: req.body.holdType,
            idd: req.body.uID
        });
        return;

    })
})

app.post('/addHold', (req, res) => {
    let sql = "SELECT * FROM `student_holds` WHERE student_id = " + req.body.uID + " AND hold_type = '" + req.body.holdType + "';"
    let sql1 = "SELECT * FROM `student` WHERE `student_id` = " + req.body.uID + ";"
    db.query(sql, (err, result) => {
        if (err || req.body.holdType == undefined) {
            console.log(err);
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        if (result.length >= 1) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                alreadyHolds: true
            });
            return;
        }

        db.query(sql1, (err, result1) => {
            if (err) {
                console.log(err);
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    error: true
                });
                return;
            }

            if (result1.length <= 0) {
                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    noStudent: true
                });
                return;
            }

            let sh = "INSERT INTO `student_holds`(`student_id`, `hold_type`) VALUES (" + req.body.uID + ",'" + req.body.holdType + "')"
            db.query(sh, (err, ressy) => {
                if (err) {
                    res.render('home', {
                        userName: req.session.username,
                        fac: isFac(req.session.role),
                        admin: isAdm(req.session.role),
                        student: isStu(req.session.role),
                        id: req.session.uID,
                        wholeName: req.session.wholeName,
                        loggedIn: nullCheck(req.session.uID),
                        CNR: courseNfaculty,
                        error: true
                    });
                    return;
                }

                res.render('home', {
                    userName: req.session.username,
                    fac: isFac(req.session.role),
                    admin: isAdm(req.session.role),
                    student: isStu(req.session.role),
                    id: req.session.uID,
                    wholeName: req.session.wholeName,
                    loggedIn: nullCheck(req.session.uID),
                    CNR: courseNfaculty,
                    addedHold: true,
                    iddd: req.body.uID,
                    truHold: req.body.holdType
                });
                return;
            })

        })
    })
})

app.get('/userSearch', (req, res) => {
    if (!(req.session.role == 'faculty' || req.session.role == 'admin')) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return
    }

    res.render('userSearch')
    return
})

app.post('/searchUser', (req, res) => {
    let searchd = req.body.searched
    let srchArr = searchd.split(" ")
    let fs = ""
    let ls = ""
    if (srchArr.length <= 0) {
        fs = ""
        ls = ""
    } else if (srchArr.length == 1) {
        fs = srchArr[0]
        ls = srchArr[0]
    } else {
        fs = srchArr[0]
        ls = srchArr[1]
    }
    let sql = "SELECT * FROM user WHERE user.First_Name LIKE '%" + fs + "%' OR user.Last_Name LIKE '%" + ls + "%'"

    db.query(sql, (err, result) => {
        if (err) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        if (result <= 0) {
            res.render('showSearched', {
                noResults: true
            })
            return
        }
        userD = []
        for (let i = 0; i < result.length; i++) {
            let x = {
                name: result[i].First_Name + " " + result[i].Last_Name,
                id: result[i].User_Id,
                email: result[i].Email,
                role: result[i].Role
            }
            userD.push(x)
        }

        res.render('showSearched', {
            noResults: false,
            userData: userD
        })

    })
})

app.get('/facHistory', (req, res) => {
    if (!(req.session.role == 'faculty')) {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            wholeName: req.session.wholeName,
            loggedIn: nullCheck(req.session.uID),
            CNR: courseNfaculty,
            error: true
        });
        return
    }

    let sql = "SELECT * FROM `faculty_history` INNER JOIN user ON user_Id = faculty_history.faculty_Id INNER JOIN courses ON courses.course_id = faculty_history.course_id WHERE faculty_history.`faculty_Id` = " + req.session.uID + ";"

    db.query(sql, (err, result) => {
        if (err) {
            console.log(err)
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                error: true
            });
            return;
        }

        if (result.length <= 0) {
            res.render('home', {
                userName: req.session.username,
                fac: isFac(req.session.role),
                admin: isAdm(req.session.role),
                student: isStu(req.session.role),
                id: req.session.uID,
                wholeName: req.session.wholeName,
                loggedIn: nullCheck(req.session.uID),
                CNR: courseNfaculty,
                noHistory: true
            });
            return;
        }

        let ud = []

        for (let i = 0; i < result.length; i++) {
            let x = {
                c_name: result[i].course_title,
                c_id: result[i].course_id,
                semmy: semesterString(result[i].semester_id)
            }
            ud.push(x)
        }

        res.render('showFacHistory', {
            userData: ud,
            name: result[0].First_Name + " " + result[0].Last_Name
        })
    })
})

app.get('/viewAttendance', (req, res) => {
    if (req.session.role != 'faculty') {
        res.render('home', {
            userName: req.session.username,
            fac: isFac(req.session.role),
            admin: isAdm(req.session.role),
            student: isStu(req.session.role),
            id: req.session.uID,
            loggedIn: req.session.loggedIn,
            CNR: courseNfaculty,
            CNR2: courseNfaculty2,
            wholeName: req.session.wholeName,
            cantView: true
        });
        return;
    }

    res.render('enterInfoViewAttendance')
})

app.post('/viewAttendance', (req, res) => {})
