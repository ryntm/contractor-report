const db = require("../models");
//ensures a clean version of Op is required
const Op = require("sequelize").Op;

const isAuthenticated = require("../config/middleware/isAuthenticated");

module.exports = function(app) {
  // ----  REPORT ROUTES----
  app.get("/api/by-contract/:contractor-name", function(req, res) {
    db.Pokemon.findOne({
      where: {
        pokeId: req.params.id
      }
    }).then(pokemon => {
      res.json(pokemon);
    });
  });

  app.get("/dashboard", isAuthenticated, function(req, res) {
    db.Pokemon.findAll().then(pokemon => {
      res.render("index", { pokemon: pokemon });
    });
  });



  app.get("/pokedex/:userId", isAuthenticated, function(req, res) {
    //grab user's caught pokemon id values
    db.Pokedex.findAll({
      attributes: ["pokeId"],
      where: {
        userId: req.params.userId
      }
    }).then(results => {
      // get list of pokeIds from Pokedex object
      const pokeIdArray = results.map(pokemon => {
        return { pokeId: pokemon.pokeId };
      });
      // grabs pokemon stats from pokemon database from user's caught pokemon json
      db.Pokemon.findAll({
        where: {
          [Op.or]: pokeIdArray
        }
      }).then(pokemon => {
        res.render("pokedex", { pokemon: pokemon });
      });
    });
  });

  app.get("/api/questions/:typeId", function(req, res) {
    db.Questions.findAll({
      where: {
        typeId: req.params.typeId
      }
    }).then(dbQuestions => {
      res.json(dbQuestions);
    });
  });

  app.get("/api/questions/", function(req, res) {
    db.Questions.findAll({}).then(dbQuestions => {
      res.json(dbQuestions);
    });
  });

  app.get("/api/pokemon_data", function(req, res) {
    db.Pokemon.findAll().then(pokemon => {
      res.json(pokemon);
    });
  });
};
