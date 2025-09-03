// src/models/module.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Parameter definition schema (embedded in module)
const parameterDefinitionSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: Schema.Types.Mixed,
    default: null
  },
  validationPattern: {
    type: String,
    default: null
  },
  validationMessage: {
    type: String,
    default: null
  }
}, { _id: false });

// Module schema
const moduleSchema = new Schema({
  moduleId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    // Only allow lowercase letters, numbers, and underscores
    match: /^[a-z0-9_]+$/
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  tooltip: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'module'
  },
  scriptName: {
    type: String,
    required: true,
    trim: true
  },
  parameterDefinitions: [parameterDefinitionSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
moduleSchema.index({ moduleId: 1 });
moduleSchema.index({ isActive: 1 });

// Make sure default modules exist
moduleSchema.statics.initDefaultModules = async function() {
  const Module = this;
  
  // Default modules
  const defaultModules = [
    {
      moduleId: 'system_info',
      name: 'System Information',
      description: 'Display system information including CPU, memory, and disk usage',
      tooltip: 'View detailed system information',
      icon: 'server',
      scriptName: 'system-info.sh',
      parameterDefinitions: [
        {
          name: 'format',
          description: 'Output format',
          type: 'string',
          required: false,
          defaultValue: 'text',
          validationPattern: '^(text|json|csv)$',
          validationMessage: 'Format must be one of: text, json, csv'
        },
        {
          name: 'detail',
          description: 'Detail level',
          type: 'string',
          required: false,
          defaultValue: 'normal',
          validationPattern: '^(minimal|normal|detailed)$',
          validationMessage: 'Detail must be one of: minimal, normal, detailed'
        }
      ],
      isActive: true
    },
    {
      moduleId: 'user_list',
      name: 'User List',
      description: 'List all system users',
      tooltip: 'View all system users',
      icon: 'users',
      scriptName: 'user-list.sh',
      parameterDefinitions: [
        {
          name: 'sortBy',
          description: 'Sort by field',
          type: 'string',
          required: false,
          defaultValue: 'name',
          validationPattern: '^(name|uid|gid)$',
          validationMessage: 'Sort field must be one of: name, uid, gid'
        }
      ],
      isActive: true
    }
  ];
  
  // Create or update default modules
  for (const moduleData of defaultModules) {
    await Module.findOneAndUpdate(
      { moduleId: moduleData.moduleId },
      moduleData,
      { upsert: true, new: true }
    );
  }
};

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
