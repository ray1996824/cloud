var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var express = require('express');
var app = express();
var session = require('cookie-session');
//var bodyParser = require('body-parser');
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended:false}));
app.use("/styles",express.static(__dirname + "/styles"));
var mongourl = "mongodb://user01:123@ds259865.mlab.com:59865/comps381f"; 
app.set('view engine','ejs');

/*
Session
*/
var expiryDate = new Date( Date.now() + 60 * 60 * 1000 ); // 1 hour
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
  cookie: { secure: true,
            httpOnly: true,
            expires: expiryDate
          }
  })
);

app.get('/',function(req,res){
  if(req.session.username == null)
    res.redirect('login');
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    var search = {};
    var criteria = null;
    var value = null;
    search[criteria] = '';
    findRestaurant(db,value,search,criteria,function(restaurant) {
      db.close();
      restaurant['owner'] = req.session.username;
     // console.log(JSON.stringify(restaurant));

      res.render("home",{r:restaurant});
    });
  });
     
  
});


app.get('/new',function(req,res){
  if(req.session.username == null)
  res.redirect('login');
  console.log("a new request:")
  res.render('new',{});
  return;
});



/** 
* 
*        Handle create restaurant
* 
*  */
app.post('/create',function(req,res){
  if(req.session.username == null)
  res.redirect('login');
  console.log("a new request in create:" + req.query );

  var queryAsObject = req.query ; 

        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
        //  console.log(JSON.stringify(files));
      
         // var title = (fields.name.length > 0) ? fields.name : "untitled";
          
        //  console.log("title = " + title);
       //   console.log("filename = " + filename);
          //
          var exif = {};
          var image = {};
          var restaurant = {};
          var address = {};
          var coord = {};
          var grades = {};
          var grades_array = [];
          address['street'] = fields.street;
          address['building'] = fields.building;
          address['zipcode'] = fields.zipcode;
          coord['longitude'] = fields.lon;
          coord['latitude'] = fields.lat;
          address['coord'] = coord;
          grades['user'] = null;
          grades['score'] = null;
          restaurant['restaurant_id'] = fields.rid;
          restaurant['name'] = fields.name;
          restaurant['borough'] = fields.borough;
          restaurant['cuisine'] = fields.cuisine;
          restaurant['address'] = address;
          restaurant['owner'] = req.session.username;
          restaurant['grades'] = grades_array;


          var mimetype = files.restaurantPhoto.type;
          image['image'] = filename;
  
          try {
            new ExifImage(image, function(error, exifData) {
              if (error) {
                console.log('ExifImage: ' + error.message);
              }
              else {
                exif['image'] = exifData.image;
                exif['exif'] = exifData.exif;
                exif['gps'] = exifData.gps;
              }
            })
          } catch (error) {
  
          }
          //
          fs.readFile(filename, function(err,data) {
            MongoClient.connect(mongourl,function(err,db) {
             
             // new_r['title'] = title;
             restaurant['image'] = new Buffer(data).toString('base64');
             restaurant['mimetype'] = mimetype;

            //  new_r['exif'] = exif;
            insertDoc(db,restaurant,function(result) {
                db.close();
                if (result) {
                  //res.render('created',restaurant);
                 res.redirect('/');
                } else {
                  res.writeHead(500, {"Content-Type": "text/plain"});
                  res.end('Unable to insert!');              
                }
              })
            });
          })
        });
      
      //res.render('new',{});
  
});


function insertPhoto(db,r,callback) {
   // console.log('image size: ' + r.image.length);
    if (r.image.length < 14000000) {
      db.collection('restaurants').insertOne(r,function(err,result) {
        assert.equal(err,null);
        console.log("insert was successful!");
        console.log(JSON.stringify(result));
        callback(result);
      });
    } else {
      callback(null);
    }
}


app.get('/update',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    db.collection('restaurants').findOne(criteria,function(err,results){
      assert.equal(err,null);
      console.log(JSON.stringify(results));
      if(results.owner == req.session.username)
      res.render("record", {r:results});
      else{
        res.render('error',{e: {msg:'You are not authorized to edit!'}});
      }


    });
  }); 
});

app.post('/update',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  console.log("Updating");
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    //console.log(JSON.stringify(files));
    var filename = files.restaurantPhoto.path;
    var mimetype = files.restaurantPhoto.type;
   // console.log(filename);
   // console.log(mimetype);
    var exif = {};
    var image = {};
    var restaurant = {};
    image['image'] = filename;
    var newValues = {};
    var address = {};
    var coord = {};
    var criteria = {};
    criteria['_id'] = ObjectID(fields._id);

    try {
      new ExifImage(image, function(error, exifData) {
        if (error) {
          console.log('ExifImage: ' + error.message);
        } else {
          exif['image'] = exifData.image;
          exif['exif'] = exifData.exif;
          exif['gps'] = exifData.gps;
          console.log('Exif: ' + JSON.stringify(exif));
        }
      });
    } catch (error) {};

    fs.readFile(filename, function(err,data) {
      MongoClient.connect(mongourl,function(err,db) {
      assert.equal(err,null);
      console.log('Connect to MongoDB\n');
      console.log(criteria['_id']);
      for(key in fields) {
        if (key == "_id") {
          newValues['_id'] = criteria['_id'];
          continue;
        }
        switch(key) {
          case 'latitude':
          case 'longitude':
            newValues['address'] = address;
            address['coord'] = coord;
            coord[key] = fields[key];
            break;
          case 'building':
          case 'street':
          case 'zipcode':
            newValues['address'] = address;
            address[key] = fields[key];
            break;
          default:
            newValues[key] = fields[key];
               
        }
      }
      restaurant['mimetype'] = mimetype;
      restaurant['image'] = new Buffer(data).toString('base64');
      newValues['mimetype'] = restaurant['mimetype'];
      newValues['image'] = restaurant['image'];
      console.log(newValues['mimetype']);
      console.log(newValues['image']);
      console.log('Preparing update: ' + JSON.stringify(newValues));
      updateRestaurant(db,criteria,newValues,function(result) {
        db.close();
        //res.render("updated",{r:newValues});
        if(result) {
          console.log(newValues._id);
          res.redirect('/display?_id='+newValues._id);
        }
      });
    });
  });
});
});

app.post('/rate',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  var criteria = {};

  var form = new formidable.IncomingForm();
  form.parse(req,function(err,fields,files) {
    criteria['_id'] = ObjectID(fields._id);
    var grades = {};
    var restaurant = {};
    grades['user'] = fields.user;
    grades['score'] = fields.score;
    restaurant['grades'] = grades;
    MongoClient.connect(mongourl,function(err,db) {
      assert.equal(err,null);
      console.log(JSON.stringify(criteria) + JSON.stringify(restaurant));
      updateRestaurantScore(db,criteria,restaurant,function(restaurant) {
        db.close();
        if(restaurant == null)
        res.render('error',{e: {msg:'You have rated this restaurant'}});
        else{
          res.redirect('/display?_id='+fields._id);
        }
        //console.log(JSON.stringify(restaurant));
       
      });
    });

  });
});


function updateRestaurant(db,criteria,newValues,callback) {
  db.collection('restaurants').updateOne(criteria,{$set:newValues},function(err,result){
    assert.equal(err,null);
    console.log("update was successfully");
    callback(result);
  });
}
function updateRestaurantScore(db,criteria,newValues,callback) {
  
  db.collection('restaurants').findOne({"grades" : {$elemMatch: { "user": newValues.grades.user}}}, function(err,result) {
    if(result!=null){
      callback(null);
    }
    else{
      db.collection('restaurants').updateOne(criteria,{$push:newValues},function(err,result){
        assert.equal(err,null);
        console.log("update was successfully");
        callback(result);
      });
    }
  });

}

app.get('/remove',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    
    db.collection('restaurants').findOne(criteria,function(err,results){
      assert.equal(err,null);
      console.log(JSON.stringify(results));
      if(results.owner != req.session.username)
        res.render('error',{e: {msg:'You are not authorized to delete!'}});
        else{
          deleteRestaurant(db,criteria,function(result) {
            db.close();
            console.log(JSON.stringify(result));
          });
          res.render("remove", {});
        }
    });

  /**   **/
  });
});

function deleteRestaurant(db,criteria,callback) {
  db.collection('restaurants').deleteOne(criteria,function(err,results){
    assert.equal(err,null);
    console.log("Delete was successfully");
    callback(results);
  });
}

app.get('/display',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  console.log('a display reqeust');
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    db.collection('restaurants').findOne(criteria,function(err,results){
      assert.equal(err,null);
      //console.log(JSON.stringify(results));
      results['username'] = req.session.username;
      res.render("display", {r:results});

    });
  }); 
});

app.get('/search',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  console.log('a search reqeust');
   res.render("search", {});
});

app.post('/search',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  console.log('Searching');
  var form = new formidable.IncomingForm();
  form.parse(req,function(err,fields,files) {
 // console.log(req.body.criteria);
  //console.log(req.body.value);
  var criteria = fields.criteria;
  var value = fields.value;
  var search = {};
  var address = {};
  var coord = {};
  console.log(value);
  search[criteria] = value;

  /*if (criteria == 'street') {
    search['address'] = address;
    address[criteria] = value;
    console.log(search);
  }*/

  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
   // console.log('connect to MongoDB\n');
    findRestaurant(db,value,search,criteria,function(restaurant) {
      db.close();
      //console.log(JSON.stringify(restaurant));
      res.render("searchResult",{r:restaurant});
    });
  });

  });


});

/*
Rate
*/
app.get('/rate',function(req,res) {
  if(req.session.username == null)
  res.redirect('login');
  var criteria = {};
  criteria['_id'] = req.query._id;
  criteria['user'] = req.query.user;
  res.render("rate",{c:criteria});
});



function findRestaurant(db,value,criteria,target,callback) {
  console.log(target);
  console.log(criteria);
  var restaurant = [];
  //cursor = db.collection('restaurants').find(criteria);
  if(target == null){
    console.log('value is null');
    cursor = db.collection('restaurants').find();
  }else{
    switch(target){
      case 'restaurant_id':case 'name': case 'borough':case 'cuisine':case 'owner':
        console.log(JSON.stringify(criteria));
        cursor = db.collection('restaurants').find(criteria);
        break;
      case 'street':
        cursor = db.collection('restaurants').find({'address.street': value});
        //console.log(JSON.stringify(cursor));
        break;
      case 'building':
        cursor = db.collection('restaurants').find({'address.building': value});
        break;
      case 'zipcode':
        cursor = db.collection('restaurants').find({'address.zipcode': value});
        break;
      case 'longitude':
        cursor = db.collection('restaurants').find({'address.coord.longitude': value});
        break;
      case 'latitude':
        cursor = db.collection('restaurants').find({'address.coord.latitude': value});
        break;
      case 'score':
        cursor = db.collection('restaurants').find({'address.grades.score': value});
        break;       
    }
    
  }
  
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if(doc != null) {
      restaurant.push(doc);
    } else {
      callback(restaurant);
    }
  });
}

/** 
 * 
 *        Handle read api restaurant
 * 
 *  */
app.get('/api/restaurant/read/:resfields/:condition',function(req,res){
  //console.log(req.params.resfields + " " + req.params.condition);
  console.log('read\n');
  
  var target = req.params.resfields;
  var condition = req.params.condition;
  MongoClient.connect(mongourl,function(err,db){
    assert.equal(err,null);
    console.log('Connected to MongoDB api read\n');
    readDoc(db,target,condition,function(restaurants){
        res.send(restaurants);
        res.end();
    });
  });
});

app.get('/api/restaurant/create',function(req,res){
  console.log("a new request insert:");
  response = {};
      
//  var filename = files.restaurantPhoto.path;
 //  var mimetype = files.restaurantPhoto.type;
 
  // console.log("filename = " + filename);
  
       var exif = {};
        var image = {};
        var restaurant = {};
        var address = {};
        var coord = {};
        var grades = [];
        
        address['street'] = req.query.street;
        address['building'] = req.query.building;
        address['zipcode'] = req.query.zipcode;
        coord['longitude'] = req.query.lon;
        coord['latitude'] = req.query.lat;
        address['coord'] = coord;
        grades['user'] = '';
        grades['score'] = '';
        restaurant['restaurant_id'] = req.query.restaurant_id;
        restaurant['name'] = req.query.name;
        restaurant['borough'] = req.query.borough;
        restaurant['cuisine'] = req.query.cuisine;
        restaurant['address'] = address;
        restaurant['owner'] = req.query.owner;
        restaurant['grades'] = grades;
        
        MongoClient.connect(mongourl,function(err,db) {
          
          // new_r['title'] = title;

         //  new_r['exif'] = exif;
         insertRestaurantAPI(db,restaurant,function(result,id){
          db.close();
          
           if (err == null) {
            response['status'] = 'ok';
            response['_id'] = id;

           } else {
            response['status'] = 'failed'   
           }
           res.send(response);
         });

            
         
         });
         
  
});

function readDoc(db,target,condition,callback){
  var restaurant = [];
  var criteria = {};
  console.log(target + " " +condition);
  criteria[target] = condition;
  console.log('criteria: '+ criteria);
  //cursor = db.collection('restaurants').find(criteria);
  if(target == null){
    console.log('value is null');
    cursor = db.collection('restaurants').find();
  }else{
    switch(target){
      case 'restaurant_id':case 'name': case 'borough':case 'cuisine':case 'owner':
        console.log(JSON.stringify(criteria));
        cursor = db.collection('restaurants').find(criteria);
        break;
      case 'street':
        cursor = db.collection('restaurants').find({'address.street': condition});
        //console.log(JSON.stringify(cursor));
        break;
      case 'building':
        cursor = db.collection('restaurants').find({'address.building': condition});
        break;
      case 'zipcode':
        cursor = db.collection('restaurants').find({'address.zipcode': condition});
        break;
      case 'longitude':
        cursor = db.collection('restaurants').find({'address.coord.longitude': condition});
        break;
      case 'latitude':
        cursor = db.collection('restaurants').find({'address.coord.latitude': condition});
        break;
      case 'score':
        cursor = db.collection('restaurants').find({'address.grades.score': condition});
        break;       
    }
  }
  
  cursor.each(function(err,doc){
    assert.equal(err,null);
    if(doc != null){
      restaurant.push(doc);
    }else{
      callback(restaurant);
    }
  });

}
function insertDoc(db,r,callback) {
    console.log('image size: ' + r.image.length);
    if (r.image.length < 14000000) {
      db.collection('restaurants').insertOne(r,function(err,result) {
        assert.equal(err,null);
        console.log("insert was successful!");
        console.log(JSON.stringify(result));
        callback(result);
      });
    } else {
      callback(null);
    }
  }

function insertRestaurantAPI(db,r,callback){
  db.collection('restaurants').insertOne(r,function(err,result) {
    assert.equal(err,null);
    console.log("insert was successful!");
    console.log("inserted data:" +r._id);
    callback(result,r._id);
  });
}




app.get('/register',function(req,res) {
   res.render('register',{});
});

app.post('/register',function(req,res) { 
   var form = new formidable.IncomingForm();
  form.parse(req,function(err,fields,files) {
  user = {};
  user['username'] = fields.username;
  user['password'] = fields.password;
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err,null);
        var authorset = {};
        
        db.collection('user').findOne(user,function(err,results){
          assert.equal(err,null);
          console.log(JSON.stringify(user));
          console.log(JSON.stringify(results));
          if(results == null){
           
            userRegister(db,user,function(result) {
                db.close();
                console.log('Disconnected MongoDB\n');
                res.redirect('/login');
            });
          }

          else{
            res.render('error',{e: {msg:'username always exist'}});
          }

        });
   
    });
  });
});

/*
Login
*/
 
app.get('/login',function(req,res) {
   res.render("login",{});
   return;
});

app.post('/login',function(req,res) {
  //console.log('login request incoming with: '+ req.url+ req.method);
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var user = {};
    user['username']  = fields.username;
    user['password']  = fields.password;
    MongoClient.connect(mongourl, function(err, db) {
      assert.equal(err,null);
     
      userLogin(db,user,function(result) {
          db.close();
          
          if(result != null){
            console.log('login with ' + result.username);
              req.session.username = result.username;
              res.redirect('/');
          }
          
          else{
            res.render('error',{e: {msg:'wrong username or password'}});
          }
          
      });
  });
  });
});

app.get("/map", function(req,res) {
	res.render("gmap", {
    name: req.query.rname,
		lat:req.query.lat,
		lon:req.query.lon,
    zoom:req.query.zoom
    
	});
	res.end();
});


function userLogin(db,user,callback) {
  console.log("Login");
  db.collection('user').findOne(user,function(err,results){
    assert.equal(err,null);
    //console.log(JSON.stringify(results));
    callback(results);

  });

}

app.get('/logout',function(req,res) {
  req.session.username = null;
    res.redirect('/login');
});



function userRegister(db,user,callback) {
    console.log("Creating new user");
  //  user = db.collection('user').findOne({username:username},{userid:1});

    //if(!user) {
        db.collection('user').insert(
              user
            , function(err, result) {
                assert.equal(err, null);
                console.log("Inserted a user into the users collection.");
                callback(true);
            }
        )
  /**  }else{
        console.log("Cannot create a new user.");
        callback(false);
    }**/
}


app.listen(app.listen(process.env.PORT || 8099 ));