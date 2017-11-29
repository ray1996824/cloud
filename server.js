var http = require('http');
var url = require('url');
var fs = require('fs');
var formidable = require('formidable');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
var mongourl = "mongodb://user01:123@ds259865.mlab.com:59865/comps381f"; 
app.set('view engine','ejs');



app.get('/new',function(req,res){
  console.log("a new request:")
 
      res.render('new',{});
  
});

/** 
* 
*        Handle create restaurant
* 
*  */
app.post('/create',function(req,res){
  console.log("a new request in create:" + req.query );

  var queryAsObject = req.query ; 

        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
          console.log(JSON.stringify(files));
          var filename = files.restaurantPhoto.path;
         // var title = (fields.name.length > 0) ? fields.name : "untitled";
          var mimetype = files.restaurantPhoto.type;
        //  console.log("title = " + title);
          console.log("filename = " + filename);
          //
          var exif = {};
          var image = {};
          var restaurant = {};
          var address = {};
          var coord = {};
          var grades = {};
          address['street'] = fields.street;
          address['building'] = fields.building;
          address['zipcode'] = fields.zipcode;
          coord['longitude'] = fields.lon;
          coord['latitude'] = fields.lat;
          address['coord'] = coord;
          grades['user'] = '';
          grades['score'] = '';
          restaurant['restaurant_id'] = fields.restaurant_id;
          restaurant['name'] = fields.name;
          restaurant['borough'] = fields.borough;
          restaurant['cuisine'] = fields.cuisine;
          restaurant['address'] = address;
          restaurant['owner'] = fields.owner;
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
                  res.send(restaurant);
                  res.end('Unable to insert!');   
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


app.get('/update',function(req,res) {
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    db.collection('restaurants').findOne(criteria,function(err,results){
      assert.equal(err,null);
      console.log(JSON.stringify(results));
      res.render("record", {r:results});

    });
  }); 
});

app.post('/update',function(req,res) {
  console.log("Updating");
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    console.log(JSON.stringify(files));
    var filename = files.restaurantPhoto.path;
    var mimetype = files.restaurantPhoto.type;
    console.log(filename);
    console.log(mimetype);
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
        res.render("updated",{r:newValues});
        if(result) {
          console.log(newValues._id);
        }
      });
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

app.get('/remove',function(req,res) {
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    deleteRestaurant(db,criteria,function(result) {
      db.close();
      console.log(JSON.stringify(result));
    });
    res.render("remove", {});
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
  console.log('a display reqeust');
  var criteria = {};
  criteria['_id'] = ObjectID(req.query._id);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    db.collection('restaurants').findOne(criteria,function(err,results){
      assert.equal(err,null);
      console.log(JSON.stringify(results));
      res.render("display", {r:results});

    });
  }); 
});

app.get('/search',function(req,res) {
  console.log('a search reqeust');
   res.render("search", {});
});

app.post('/search',function(req,res) {
  console.log('Searching');
  console.log(req.body.criteria);
  console.log(req.body.value);
  var criteria = req.body.criteria;
  var value = req.body.value;
  var search = {};
  search[criteria] = value;
  console.log(search);
  MongoClient.connect(mongourl,function(err,db) {
    assert.equal(err,null);
    console.log('connect to MongoDB\n');
    findRestaurant(db,search,function(restaurant) {
      db.close();
      console.log(JSON.stringify(restaurant));
      res.render("searchResult",{r:restaurant});
    });
  });

});

function findRestaurant(db,criteria,callback) {
  var restaurant = [];
  cursor = db.collection('restaurants').find(criteria);
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
app.get('/api/restaurant/read/:resfields/:condition',function(req,res,next){
  //console.log(req.params.resfields + " " + req.params.condition);
  var target = req.params.resfields;
  var condition = req.params.condition;
  MongoClient.connect(mongourl,function(err,db){
    assert.equal(err,null);
    console.log('Connected to MongoDB\n');
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
        var grades = {};
        
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
      
        
        MongoClient.connect(mongourl,function(err,db) {
          
          // new_r['title'] = title;

         //  new_r['exif'] = exif;
         insertRestaurantAPI(db,restaurant,function(result){
          db.close();
          
           if (err == null) {
            response['status'] = 'ok'

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
  cursor = db.collection('restaurants').find(criteria);
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
    console.log(JSON.stringify(result));
    callback(result);
  });
}
app.listen(app.listen(process.env.PORT || 8099 ));
