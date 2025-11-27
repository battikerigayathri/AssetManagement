const User = require("./User");
const Asset=require("./Asset");
const Category=require("./Category")
const File=require("./File");
const models = {
  User: User,
  Asset:Asset,
  Category:Category,
  File:File
};
module.exports = models;
