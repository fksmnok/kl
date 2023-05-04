import express, { Application, Request, Response } from 'express'
import PATH from 'path';
const app: Application = express()
const PORT = 3000
const passport = require('passport');
const LineStrategy = require('./lib').Strategy;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const fileUpload = require("express-fileupload");

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.set("views", "./views");
app.use(fileUpload());

app.use(express.static(__dirname + "/public", { index: false }))
app.use(express.static(__dirname + "/views", { index: false }))

declare module "express" {
    export interface Request {
        user: any
    }
}

/*-------------------DB--------------------*/
const { createConnection } = require("mysql"); // ライブラリのimport
import { Connection, MysqlError } from "mysql"; // 型定義のimport

const con: Connection = createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: 3306,
    database: 'knowkedge_library'
});
/*------------------------------------------------------*/


/*-------------------LINE認証--------------------*/

passport.use(new LineStrategy({
    channelID: '1657645231',
    channelSecret: '60cad8c38eccb107bb9b719cf9a0836c',
    callbackURL: 'http://localhost:3000/auth/line/callback',
    scope: ['profile', 'openid', 'email'],
    botPrompt: 'aggressive'
},
    function (accessToken: any, refreshToken: any, params: any, profile: any, cb: any) {
        const { email } = jwt.decode(params.id_token);
        profile.email = email;
        return cb(null, profile, accessToken);
    }));

// Configure Passport authenticated session persistence.
passport.serializeUser(function (user: any, cb: any) { cb(null, user); });
passport.deserializeUser(function (obj: any, cb: any) { cb(null, obj); });

// Use application-level middleware for common functionality, including
// parsing, and session handling.
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard dog', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the session.
app.use(passport.initialize());
app.use(passport.session());

app.post('/auth/line', passport.authenticate('line', { successRedirect: '/top', failureRedirect: '/login' }));
// ログイン 【GO】処理 成功なら/へだめならloginへ
app.get('/auth/line/callback', passport.authenticate('line', { successRedirect: '/top', failureRedirect: '/login' }),
    function (err, res) {
        if (err) return res.status(500).send(err);
        console.log(err);
        // ログイン成功
        res.redirect('/top');
    }
);

// Define routes.
// マイページ
app.get('/top', function (req, res) {
    if (req.user) {

        let noteValue = [
            'note',
            req.user.id
        ]

        let likeValue = [
            'like_post',
            req.user.id
        ]

        let userValue = [
            'student',
            req.user.id,
            req.user.displayName,
            req.user.displayName,
            req.user.email,
            req.user.id
        ]

        let userInfo = [
            'student',
            req.user.id
        ]

        const selectSql = "SELECT * FROM ?? WHERE student_id = ?;";
        const selectSql2 = "SELECT * FROM ?? WHERE user_id = ?;";
        const insertSql = "INSERT INTO ??(id_line, name, dis_name, mail) SELECT ?, ?, ?, ? WHERE NOT EXISTS( SELECT * FROM student WHERE id_line = ? )";
        const user = "SELECT * FROM ?? WHERE id_line = ?;"

        con.query(insertSql, userValue, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
        });

        con.query(selectSql, noteValue, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            console.log(results);
            con.query(user, userInfo, (err: MysqlError | null, user_re: any) => {
                if (err) {
                    console.log('error connecting:' + err.stack);
                    return;
                }
                con.query(selectSql2, likeValue, (err: MysqlError | null, results2: any) => {
                    if (err) {
                        console.log('error connecting:' + err.stack);
                        return;
                    }
                    if (!results) {
                        res.render('top.ejs', { user: req.user });
                    } else {
                        res.render('top.ejs', {
                            user: req.user,
                            upload_note: results,
                            user_info: user_re,
                            like_note: results2
                        });
                    }
                });
            });
        });


    } else {
        res.render('index.ejs');
    }
});

/*-------------------myノート--------------------*/
app.get('/note', function (req, res) {
    if (req.user) {

    } else {
        res.render('index.ejs');
    }
});

app.get('/note/:id', function (req, res) {
    if (req.user) {
        let pickId = req.params.id;
        let value = [
            'note',
            pickId
        ]
        let likeNote = [
            'like_post',
            pickId,
            req.user.id
        ]
        let cVal = [
            'comment',
            pickId
        ]

        let rVal = [
            'reply',
            pickId
        ]

        //console.log(pickId);
        const selectSql = "SELECT * FROM ?? WHERE id = ?;";
        const selectSql2 = "SELECT * FROM ?? WHERE like_id = ? AND user_id = ?;";
        const selectSql3 = "SELECT * FROM ?? WHERE note_id = ?;";
        const selectSql4 = "SELECT * FROM ?? WHERE note_id = ?;";
        con.query(selectSql, value, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            con.query(selectSql2, likeNote, (err: MysqlError | null, results2: any) => {
                if (err) {
                    console.log('error connecting:' + err.stack);
                    return;
                }
                let number = Number(results2.length);
                con.query(selectSql3, cVal, (err: MysqlError | null, results3: any) => {
                    if (err) {
                        console.log('error connecting:' + err.stack);
                        return;
                    }
                    con.query(selectSql4, rVal, (err: MysqlError | null, results4: any) => {
                        if (err) {
                            console.log('error connecting:' + err.stack);
                            return;
                        }

                        res.render('note.ejs', {
                            user: req.user,
                            pick: results,
                            num: number,
                            pickId,
                            comment: results3,
                            reply: results4
                        });
                    })
                })
            })
        })
    } else {
        res.render('index.ejs');
    }
});

app.get('/edit', function (req, res) {
    res.render('note_edit.ejs');
});

/*------------------------------------------------------*/

/*-------------------ノート一覧表示--------------------*/
app.get('/all', function (req, res) {
    if (req.user) {
        const selectSql1 = "SELECT * FROM note WHERE item = '関係法令・制度' ORDER BY id DESC;";
        const selectSql2 = "SELECT * FROM note WHERE item = '公衆衛生・環境衛生' ORDER BY id DESC;";
        const selectSql3 = "SELECT * FROM note WHERE item = '感染症' ORDER BY id DESC;";
        const selectSql4 = "SELECT * FROM note WHERE item = '衛生管理技術' ORDER BY id DESC;";
        const selectSql5 = "SELECT * FROM note WHERE item = '人体の構造及び機能' ORDER BY id DESC;";
        const selectSql6 = "SELECT * FROM note WHERE item = '皮膚化学' ORDER BY id DESC;";
        const selectSql7 = "SELECT * FROM note WHERE item = '美容の物理と化学' ORDER BY id DESC;";
        const selectSql8 = "SELECT * FROM note WHERE item = '美容理論' ORDER BY id DESC;";

        con.query(selectSql1, (err: MysqlError | null, results1: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            con.query(selectSql2, (err: MysqlError | null, results2: any) => {
                if (err) {
                    console.log('error connecting:' + err.stack);
                    return;
                }
                con.query(selectSql3, (err: MysqlError | null, results3: any) => {
                    if (err) {
                        console.log('error connecting:' + err.stack);
                        return;
                    }
                    con.query(selectSql4, (err: MysqlError | null, results4: any) => {
                        if (err) {
                            console.log('error connecting:' + err.stack);
                            return;
                        }
                        con.query(selectSql5, (err: MysqlError | null, results5: any) => {
                            if (err) {
                                console.log('error connecting:' + err.stack);
                                return;
                            }
                            con.query(selectSql6, (err: MysqlError | null, results6: any) => {
                                if (err) {
                                    console.log('error connecting:' + err.stack);
                                    return;
                                }
                                con.query(selectSql7, (err: MysqlError | null, results7: any) => {
                                    if (err) {
                                        console.log('error connecting:' + err.stack);
                                        return;
                                    }
                                    con.query(selectSql8, (err: MysqlError | null, results8: any) => {
                                        if (err) {
                                            console.log('error connecting:' + err.stack);
                                            return;
                                        }

                                        if (!results1) {
                                            res.render('all_note.ejs', { user: req.user });
                                        } else {
                                            res.render('all_note.ejs', {
                                                user: req.user,
                                                note_item1: results1,
                                                note_item2: results2,
                                                note_item3: results3,
                                                note_item4: results4,
                                                note_item5: results5,
                                                note_item6: results6,
                                                note_item7: results7,
                                                note_item8: results8
                                            });
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            })
        });
    } else {
        res.render('index.ejs');
    }
});

/*-------------------ノートpickup--------------------*/
app.get('/pick', function (req, res) {
    if (req.user) {

    } else {
        res.render('index.ejs');
    }
});

app.get('/pick/:id', function (req, res) {
    if (req.user) {
        let pickId = req.params.id;
        let value = [
            'note',
            pickId
        ]
        let likeNote = [
            'like_post',
            pickId,
            req.user.id
        ]
        let cVal = [
            'comment',
            pickId
        ]

        let rVal = [
            'reply',
            pickId
        ]

        //console.log(pickId);
        const selectSql = "SELECT * FROM ?? WHERE id = ?;";
        const selectSql2 = "SELECT * FROM ?? WHERE like_id = ? AND user_id = ?;";
        const selectSql3 = "SELECT * FROM ?? WHERE note_id = ?;";
        const selectSql4 = "SELECT * FROM ?? WHERE note_id = ?;";
        con.query(selectSql, value, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            con.query(selectSql2, likeNote, (err: MysqlError | null, results2: any) => {
                if (err) {
                    console.log('error connecting:' + err.stack);
                    return;
                }
                let number = Number(results2.length);
                con.query(selectSql3, cVal, (err: MysqlError | null, results3: any) => {
                    if (err) {
                        console.log('error connecting:' + err.stack);
                        return;
                    }
                    con.query(selectSql4, rVal, (err: MysqlError | null, results4: any) => {
                        if (err) {
                            console.log('error connecting:' + err.stack);
                            return;
                        }

                        res.render('pick.ejs', {
                            user: req.user,
                            pick: results,
                            num: number,
                            pickId,
                            comment: results3,
                            reply: results4
                        });
                    })
                })
            })
        })
    } else {
        res.render('index.ejs');
    }
});

/*-------------------ノートLIKE--------------------*/
app.post('/like', function (req, res) {
    console.log('POST:' + req.body.post_data);
    let values = [
        'like_post',
        req.body.userId,
        req.body.id,
        req.body.item,
        req.body.appeal,
        req.body.note_name
    ]

    console.log(values);
    let values2 = [
        'note',
        req.body.id
    ]

    let values3 = [
        'note',
        req.body.id
    ]

    const insertSql = "INSERT INTO ??(user_id, like_id, item, appeal, note_name) VALUES (?, ?, ?, ?, ?)";
    const updateSql = "UPDATE ?? SET like_num=like_num+1 WHERE id = ?";
    const selectSql = "SELECT like_num FROM ?? WHERE id = ?;";
    con.query(selectSql, values3, (err: MysqlError | null, result: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }

        con.query(insertSql, values, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
        });
        con.query(updateSql, values2, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
        });
        let senddata = {
            name: req.body.userId + "@" + req.body.id,
            result
        }
        res.send(senddata);
    });
});

/*-------------------SETTING--------------------*/
app.get('/setting', function (req, res) {
    if (req.user) {

        const selectSql = "SELECT * FROM ?? WHERE id_line = ?;";
        let values = [
            'student',
            req.user.id,
        ]
        con.query(selectSql, values, (err: MysqlError | null, result: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
            res.render('setting.ejs', { user: req.user, set: result });
        })
    } else {
        res.render('index.ejs');
    }

});

app.post('/set', function (req, res) {
    console.log('POST:' + req.body.post_data);
    let values = [
        'student',
        req.body.disName,
        req.body.profile,
        req.body.insta,
        req.body.pref,
        req.body.school,
        req.user.id
    ]

    console.log(values);

    const updateSql = "UPDATE ?? SET dis_name=?, profile=?, insta=?, pref=?, school=? WHERE id_line = ?";

    con.query(updateSql, values, (err: MysqlError | null, results: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
    });
    let senddata = {
        disname: req.body.disName,
        profile: req.body.profile,
        insta: req.body.insta,
        school: req.body.school
    }
    res.send(senddata);

});

/*-------------------ノートLIKE削除--------------------*/
app.post('/dellike', function (req, res) {
    console.log('POST:' + req.body.post_data);
    let values = [
        'like_post',
        req.body.id,
        req.body.userId
    ]

    console.log(values);
    let values2 = [
        'note',
        req.body.id
    ]

    let values3 = [
        'note',
        req.body.id
    ]

    const deleteSql = "DELETE FROM ?? WHERE like_id = ? AND user_id = ?";
    const updateSql = "UPDATE ?? SET like_num=like_num-1 WHERE id = ?";
    const selectSql = "SELECT like_num FROM ?? WHERE id = ?;";
    con.query(selectSql, values3, (err: MysqlError | null, result: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }

        con.query(deleteSql, values, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
        });
        con.query(updateSql, values2, (err: MysqlError | null, results: any) => {
            if (err) {
                console.log('error connecting:' + err.stack);
                return;
            }
        });
        let senddata = {
            name: req.body.userId + "@" + req.body.id,
            result
        }
        res.send(senddata);
    });
});

/*-------------------ノートコメント--------------------*/
app.post('/comment', function (req, res) {

    let values = [
        'comment',
        req.body.pickId,
        req.user.displayName + "@" + req.body.comment,
        req.user.id,
        req.user.displayName,
        req.body.sId,
        0
    ]

    const com = [
        'note',
        req.body.pickId
    ]

    const complus = "UPDATE ?? SET com_num = com_num + 1 WHERE id = ?";
    const insertSql = "INSERT INTO ??(note_id, comment, user_id, user_name, contributor, noti) VALUES (?, ?, ?, ?, ?, ?)";

    con.query(insertSql, values, (err: MysqlError | null, results: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
    });

    con.query(complus, com, (err: MysqlError | null, plus: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
    });

    let senddata = {
        comment: req.user.displayName + "@" + req.body.comment
    }
    console.log(senddata);
    res.send(senddata);
});

/*-------------------リプライコメント--------------------*/
app.post('/reply', function (req, res) {

    let values = [
        'reply',
        req.body.pickId,
        req.user.displayName + "@" + req.body.comment,
        req.user.id,
        req.user.displayName,
        req.body.sId,
        req.body.rId,
        req.body.rName,
        0
    ]

    console.log(values);

    const insertSql = "INSERT INTO ??(note_id, comment, user_id, user_name, contributor, rep_id, reply, noti) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    con.query(insertSql, values, (err: MysqlError | null, results: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
    });

    let senddata = {
        comment: req.user.displayName + "@" + req.body.comment
    }
    res.send(senddata);
});


/*-------------------ノート検索--------------------*/
app.get('/search', function (req, res) {
    if (req.user) {
        res.render('search.ejs', { user: req.user });
    } else {
        res.render('index.ejs');
    }
});

app.post('/search', function (req, res) {

    // 送信されたデータ
    const note = req.body.note_search;

    let values = [
        'note',
        "%" + note + "%"
    ]

    const selectSql = "SELECT * FROM ?? WHERE appeal LIKE ?";;
    con.query(selectSql, values, (err: MysqlError | null, results: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
        let length = results.length;
        if (length == 0) {
            res.render('search.ejs', {
                msg: "検索結果がありません。",
                user: req.user,
                result: results,
                note
            });
        } else {
            res.render('search.ejs', {
                msg: "",
                user: req.user,
                result: results,
                note
            });
        }
    });
});


/*-------------------ノートアップロード--------------------*/

app.post('/upload', (req, res) => {
    if (!req.files) {
        return res.status(400).send("画像がアップロードされていません。");
    }
    if (!req.files) {
        return res.status(400).send("画像がアップロードされていません。");
    }
    let userId = req.body.userId;
    let item = req.body.item;
    let appeal = req.body.appeal;
    let uploadFile = req.files.file;

    //console.log(uploadFile[0]);


    const now: any = new Date();
    let Year = now.getFullYear();
    let Month = now.getMonth() + 1;
    let Day = now.getDate();
    let Hour = now.getHours();
    let Min = now.getMinutes();

    let time = Year + "-" + Month + "-" + Day + " " + Hour + ":" + Min;

    let values = [
        'note',
        req.user.displayName,
        userId,
        item,
        appeal,
        '0',
        '0',
        time,
    ]

    if (uploadFile[0] == undefined) {
        //拡張子取り出し
        const ext = PATH.extname(uploadFile.name);
        const filename = uploadFile.name.replace(/^(.+)\..+$/, '$1')
        console.log(filename);

        let path = "public/img/" + req.body.userId;

        //ディレクトリ存在チェック
        if (!fs.existsSync(path)) {

            //ディレクトリ作成
            fs.mkdir(path, { recursive: true }, (err: any) => {
                if (err) throw err;
            });

        }

        let uploadPath = __dirname + "/" + path + "/" + uploadFile.name;

        //アップロード
        uploadFile.mv(uploadPath, function (err: any) {
            if (err) return res.status(500).send(err);

            //ファイル名変更
            fs.rename(uploadPath, __dirname + "/" + path + "/" + filename + "_" + req.body.userId + "_" + '0' + ext, (err: any) => {
                if (err) throw err;
            });

        });
        values.push(filename + "_" + req.body.userId + "_" + "0" + ext);
        for (let i = 0; i < 4; i++) {
            values.push(null);
        }
    } else {
        for (let i = 0; i < 5; i++) {
            if (uploadFile[i] == undefined) {
                values.push(null);
            } else {
                //拡張子取り出し
                const ext = PATH.extname(uploadFile[i].name);
                const filename = uploadFile[i].name.replace(/^(.+)\..+$/, '$1')
                console.log(filename);

                let path = "public/img/" + req.body.userId;

                //ディレクトリ存在チェック
                if (!fs.existsSync(path)) {

                    //ディレクトリ作成
                    fs.mkdir(path, { recursive: true }, (err: any) => {
                        if (err) throw err;
                    });

                }

                let uploadPath = __dirname + "/" + path + "/" + uploadFile[i].name;

                //アップロード
                uploadFile[i].mv(uploadPath, function (err: any) {
                    if (err) return res.status(500).send(err);

                    //ファイル名変更
                    fs.rename(uploadPath, __dirname + "/" + path + "/" + filename + "_" + req.body.userId + "_" + i + ext, (err: any) => {
                        if (err) throw err;
                    });

                });
                values.push(filename + "_" + req.body.userId + "_" + i + ext);
            }
        }
    }
    console.log(values);
    const insertSql = `INSERT INTO ??(name, student_id, item, appeal, like_num, com_num, time, note_name, note_name2, note_name3, note_name4, note_name5) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    con.query(insertSql, values, (err: MysqlError | null, results: any) => {
        if (err) {
            console.log('error connecting:' + err.stack);
            return;
        }
    });
    res.redirect('/top');

})
/*------------------------------------------------------*/

/*-------------------HOME--------------------*/
app.get('/', function (req, res) {

    console.log("hello");
    res.render('index.ejs', { home: "hello" });

});
/*------------------------------------------------------*/


/*-------------------LOGIN--------------------*/
app.get('/login', function (req, res) {
    res.render('auth/login.ejs');
});
/*------------------------------------------------------*/

//404
app.use((req, res, next) => {
    res.status(404);
    res.sendFile(__dirname + "/views/notfound.html");
});

//500
app.use(function (err: any, req: any, res: any, next: any) {
    res.status(500);
    res.redirect('/login');
});

try {
    app.listen(PORT, () => {
        console.log(`dev server running at: http://localhost:${PORT}/`)
    })
} catch (e) {
    if (e instanceof Error) {
        console.error(e.message)
    }
}
