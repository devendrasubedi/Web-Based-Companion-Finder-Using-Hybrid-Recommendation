import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  lastLogin: { 
    type: Date 
  },


  gender: { type: String },
  province: { type: String },
  district: { type: String },
  experienceLevel: { type: String, default: 'beginner' },
  interests: { type: [String], default: [] },
  pastHikes: { type: [String], default: [] },
  savedHikes: { type: [String], default: [] }
}, 

{ 
  timestamps: true // This automatically handles createdAt and updatedAt
});

// Add 'users' as the third argument to force the collection name
export const userModel = mongoose.model('usrModel', userSchema, 'users');
