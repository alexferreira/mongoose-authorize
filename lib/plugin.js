
/**
 * Dependencies
 * --------------------------------------------------------------------------*/

var _           = require('lodash')
  , mongoose    = require('mongoose')
  , Schema      = mongoose.Schema
  , ObjectId    = Schema.ObjectId;


/**
 * Object plugin
 * --------------------------------------------------------------------------*/

module.exports = function(schema, options) {
  var map = {};

  options = _.defaults(options || {}, DEFAULT_OPTIONS);
  
  var Ability = new Schema({
    reference : { type: String, trim: true },
    conditions: { type: Object },
    actions   : { type: Array }
  }, {
    _id: false
  });

  var ability = {};
  if(!schema.paths[options.path]) ability[options.path] = [Ability];
  schema.add(ability);

  schema.methods.grant = function(subject, permissions, condition) {
    var _this = this;
    if(!_.isFunction(condition)) condition = true;
    
    subjectId = getId(subject);
    key = subject.constructor.modelName ? [subject.constructor.modelName, subjectId].join(':') : ['feature', subject].join(':');
    
    permissions || (permissions = []);
    this[options.path] || (this[options.path] = []);
    
    if(_.isArray(permissions)){
      permissions.forEach(function(perm){
        _this.grant(subject, perm);
      });
      return;
    }

    this.expandRoles(key, permissions);

    this[options.path] = _.reject(this[options.path], function(obj){
      return !obj.reference && obj.actions.length === 0;
    });

    this.markModified(options.path);
  };

  schema.methods.expandRoles = function(key, action) {
    var abilities = this[options.path] || (this[options.path] = []);
    var userAbility = _.find(abilities, { 'reference': key });

    if(userAbility)
      userAbility.actions.push(action)
    else
      abilities.push({reference: key, actions: action})

    return abilities
  };

  schema.methods.getPermissions = function(){
    return this[options.path];
  }

  schema.statics.authorize = function(obj){
    var type = obj.constructor.modelName ? obj.constructor.modelName : 'feature';
    var acl = {};
    acl[options.path] = {};
    acl[options.path]['$elemMatch'] = {};
    acl[options.path]['$elemMatch']['reference'] = [type, obj._id].join(':');
    acl[options.path]['$elemMatch']['actions'] = {  $in : ['read'] };
    return this.find(acl);
  }

};


/**
 * Utility functions
 * --------------------------------------------------------------------------*/

function getId(item){
  if(_.isObject(item))
    return item[DEFAULT_OPTIONS.idField];
  return item;
}

/**
 * Constants and mappings
 * --------------------------------------------------------------------------*/

var DEFAULT_OPTIONS = {
  idField : '_id',
  path: 'abilities'
};
