const mongoose = require('mongoose');
mongoose.connect('mongodb://newcareerpointinstitute_db_user:Vw8hVi9pFlcjMdgj@ac-uvhmjat-shard-00-00.mo0d54p.mongodb.net:27017,ac-uvhmjat-shard-00-01.mo0d54p.mongodb.net:27017,ac-uvhmjat-shard-00-02.mo0d54p.mongodb.net:27017/FMS?ssl=true&authSource=admin').then(async () => {
    const ClassTemplate = mongoose.model('ClassTemplate', new mongoose.Schema({ grade: String, stream: String, board: String }, { collection: 'classtemplates' }));
    const templates = await ClassTemplate.find({ grade: { $regex: /CET/i } });
    console.log('Templates found:', templates.length);
    
    const templateIds = templates.map(t => t._id);
    const AcademicClass = mongoose.model('AcademicClass', new mongoose.Schema({ templateId: mongoose.Schema.Types.ObjectId, isActive: Boolean }, { collection: 'academicclasses' }));
    
    const classes = await AcademicClass.find({ templateId: { $in: templateIds }, isActive: true });
    console.log('Classes found:', classes.length);
    process.exit(0);
});
