const mongoose = require('mongoose');
mongoose.connect('mongodb://newcareerpointinstitute_db_user:Vw8hVi9pFlcjMdgj@ac-uvhmjat-shard-00-00.mo0d54p.mongodb.net:27017,ac-uvhmjat-shard-00-01.mo0d54p.mongodb.net:27017,ac-uvhmjat-shard-00-02.mo0d54p.mongodb.net:27017/FMS?ssl=true&authSource=admin')
.then(() => mongoose.connection.db.collection('students').findOne({ whatsappNumber: { $regex: /38472/ } }))
.then(s => { console.log(s?.admissionNumber); mongoose.disconnect(); })
.catch(console.error);
