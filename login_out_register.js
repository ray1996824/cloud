/*
Session
*/
app.use(session({
    name: 'session',
}));

/*
Register
*/
app.get('/register',function(req,res) {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register',function(req,res) {
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err,null);
        userRegister(db,req.body.username,req.body.password,function(result) {
            db.close();
            console.log('Disconnected MongoDB\n');
            res.redirect('/');
        });
    });
});

/*
Logout
*/
app.get('/logout',function(req,res) {
    req.session = null;
    res.redirect('/');
});

/*
Login
*/
app.get('/login',function(req,res) {
    res.sendFile(__dirname + '/public/login.html');
});

/*
Rate
*/
app.post('/rate',function(req,res) {
    var criteria = {
        _id : ObjectId(req.rate._id)
    };
    console.log('Delete' + JSON.stringify(criteria));
    MongoClient.connect(mongourl,function(err,db) {
        assert.equal(err,null);
        db.collection('restaurants').update(
            { _id: ObjectId(req.rate._id) },
            { $push:
                { grades:
                    {
                        username:req.session.username,
                        score:req.rate.score
                    }
                }
            },function(err,result) {
                assert.equal(err, null);
                console.log("Rated");
                res.redirect('/display?_id='+req.rate._id);
            }

        )
    });
});