const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const { render } = require('ejs');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const port = 5000;

app.get("/", (req, res) => {
  const sql = `SELECT
	                id,
	                first||' '||last name,
	                gender,
	                dob born,
	                iif(isalive = 'yes', "Alive", "Died"||iif(length(dod)>2, ' on '||dod, '')) status
                FROM persons ORDER BY first||last`;
  // const sql = `SELECT id,	first||' '||last name, gender||iif(length(dob)>2, ' (born:'||strftime('%d-%m-%Y', dob)||iif(length(dod)>2, ', died:'||strftime('%d-%m-%Y', dod)||dod||')', ')'), '') details FROM persons ORDER BY first||last`;
  db.all(sql, (err, rows) => {
    if (err) {
      console.log(`Error reading from relationships table: ${err.message}`);
      const error = {
        type: "Error reading relationship table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (rows.length === 0) {
        const error = {
          type: "No Data Available",
          details: "Please enter persons first"
        }
        res.render('errorpage', { error });
      } else {
        res.render('home', { rows });
      };
    }
  })
});

app.get('/addperson', (req, res) => {
  res.render('addperson', {})
});

app.post('/addperson', (req, res) => {
  const { first, last, gender, dob, isalive, dod } = req.body;
  let is_alive = "";
  let dod_ = ""
  if (!first || first === '') {
    res.redirect('/addperson');
  } else {
    if (gender === 'Select Gender') {
      res.redirect('/addperson');
    } else {
      if (isalive === '') {
        is_alive = 'yes';
        dod_ = '';
      } else {
        is_alive = 'no';
        dod_ = dod;
      };
      const sql = `INSERT INTO persons (first, last, gender, dob, isalive, dod) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(sql, [first, last, gender, dob, is_alive, dod_], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          console.log("Record inserted in persons table");
          res.redirect('/');
        }
      });
    };
  };
});

app.get('/showperson/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT 
                rs.person1id, 
                p1.first||' '||p1.last person1, 
                rs.relationid, r.relation, 
                rs.person2id,
                p2.first||' '||p2.last person2
                FROM relationships rs
                LEFT JOIN relations r ON r.id = rs.relationid
                LEFT JOIN persons p1 ON p1.id = rs.person1id
                LEFT JOIN persons p2 ON p2.id = rs.person2id
                WHERE rs.person1id = ?
                ORDER BY rs.relationid`;
  db.all(sql, req.params.id, (err, rows) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from relationshps table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      const data = {id, rows}
      res.render('showperson', { data });
    }
  });
});

app.get('/listrelations', (req, res) => {
  const sql = `SELECT
	                id,
	                first||' '||last name,
	                gender,
	                dob born,
	                iif(isalive = 'yes', "Alive", "Died"||iif(length(dod)>2, ' on '||dod, '')) status
                FROM persons ORDER BY first||last`;
  // const sql = `SELECT id,	first||' '||last name, gender||iif(length(dob)>2, ' (born:'||strftime('%d-%m-%Y', dob)||iif(length(dod)>2, ', died:'||strftime('%d-%m-%Y', dod)||dod||')', ')'), '') details FROM persons ORDER BY first||last`;
  db.all(sql, (err, rows) => {
    if (err) {
      console.log(`Error reading from relationships table: ${err.message}`);
      const error = {
        type: "Error reading relationship table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (rows.length === 0) {
        const error = {
          type: "No Data Available",
          details: "Please enter persons first"
        }
        res.render('errorpage', { error });
      } else {
        res.render('listrelations', { rows });
      };
    }
  })
});

app.get('/addrelations/:id', (req, res) => {
  const id = req.params.id;
  let relations = {
    father: { id: 0, name: '' },
    mother: { id: 0, name: '' },
    husband: { id: 0, name: '' },
    wife: { id: 0, name: '' },
    sons: [],
    daughters: [],
    brothers: [],
    sisters: [],
  };
  const sql = `SELECT rs.id, 
  rs.person1id,
  p1.first||' '||p1.last person1,
  p1.gender, 
  rs.relationid, 
  rs.person2id, 
  p2.first||' '||p2.last person2
  FROM relationships rs
  LEFT JOIN persons p1 ON p1.id = rs.person1id
  LEFT JOIN persons p2 ON p2.id = rs.person2id
  WHERE rs.person1id = ?`;
  db.all(sql, id, (err, rows) => {
    if (err) {
      console.log(`Error reading from relationships table: ${err.message}`);
      const error = {
        type: "Error reading relationship table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (rows.length < 1) {
        const sql2 = `SELECT id, first||' '||last name, gender FROM persons WHERE id = ?`;
        db.all(sql2, id, (err, recs) => {
          if (err) {
            console.log(`Error reading from persons table: ${err.message}`);
            const error = {
              type: "Error reading persons table",
              details: err.message
            }
            res.render('errorpage', { error });
          }
          const data = {
            person1id: recs[0].id,
            person1: recs[0].name,
            gender: recs[0].gender,
            relations: relations
          };
          res.render('addrelations', { data });
        });
      } else {
        for (i = 0; i < rows.length; i++) {
          switch (rows[i].relationid) {
            case 1:
              relations.father.id = rows[i].person2id;
              relations.father.name = rows[i].person2;
              break;
            case 2:
              relations.mother.id = rows[i].person2id;
              relations.mother.name = rows[i].person2;
              break;
            case 3:
              relations.husband.id = rows[i].person2id;
              relations.husband.name = rows[i].person2;
              break;
            case 4:
              relations.wife.id = rows[i].person2id;
              relations.wife.name = rows[i].person2;
              break;
            case 5:
              relations.sons.push({ id: rows[i].person2id, name: rows[i].person2 })
              break;
            case 6:
              relations.daughters.push({ id: rows[i].person2id, name: rows[i].person2 })
              break;
            case 7:
              relations.brothers.push({ id: rows[i].person2id, name: rows[i].person2 })
              break;
            case 8:
              relations.sisters.push({ id: rows[i].person2id, name: rows[i].person2 })
              break;
          }
        }
        const data = {
          person1id: rows[0].person1id,
          person1: rows[0].person1,
          gender: rows[0].gender,
          relations: relations
        };
        res.render('addrelations', { data });
      }
    }
  });
});

app.get('/addfather/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'male' ORDER BY first||' '||last`;
      db.all(sql, (err, fathers) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 1,
            fathers: fathers
          };
          res.render('addfather', { data })
        }
      });
    }
  });
});

app.post('/addfather', (req, res) => {
  const { id, name, gender, relationid, father } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = father;
  const person1id_2 = father;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 5;
  } else {
    relationid_2 = 6;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
  console.log({
    person1id: id,
    relationid: relationid,
    person2id: father
  });
});

app.get('/addmother/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'female' ORDER BY first||' '||last`;
      db.all(sql, (err, mothers) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 2,
            mothers: mothers
          };
          res.render('addmother', { data })
        }
      });
    }
  });
});

app.post('/addmother', (req, res) => {
  const { id, name, gender, relationid, mother } = req.body;
  console.log({
    id: id,
    name: name,
    gender: gender,
    relationid: relationid,
    mother: mother
  })
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = mother;
  const person1id_2 = mother;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 5;
  } else {
    relationid_2 = 6;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
  console.log({
    person1id: id,
    relationid: relationid,
    person2id: mother
  });
});

app.get('/addwife/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'female' ORDER BY first||' '||last`;
      db.all(sql, (err, wives) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 4,
            wives: wives
          };
          res.render('addwife', { data })
        }
      });
    }
  });
});

app.post('/addwife', (req, res) => {
  const { id, name, gender, relationid, wife, dom } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = wife;
  const person1id_2 = wife;
  let relationid_2 = '';
  relationid_2 = 3;
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          let sql = `UPDATE persons SET dom = ? WHERE id IN (?, ?)`;
          db.run(sql, [dom, person1id_1, person2id_1], (err) => {
            if (err) {
              console.log(`Error writing database: ${err.message}`);
              const error = {
                type: "Error writing to persons table",
                details: err.message
              }
              res.render('errorpage', { error });
            } else {
              res.redirect(`/addrelations/${id}`);
            }
          });
        }
      });
    }
  });
});

app.get('/addhusband/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'male' ORDER BY first||' '||last`;
      db.all(sql, (err, husbands) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 3,
            husbands: husbands
          };
          res.render('addhusband', { data })
        }
      });
    }
  });
});

app.post('/addhusband', (req, res) => {
  const { id, name, gender, relationid, husband, dom } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = husband;
  const person1id_2 = husband;
  let relationid_2 = '';
  relationid_2 = 4;
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          let sql = `UPDATE persons SET dom = ? WHERE id IN (?, ?)`;
          db.run(sql, [dom, person1id_1, person2id_1], (err) => {
            if (err) {
              console.log(`Error writing database: ${err.message}`);
              const error = {
                type: "Error writing to persons table",
                details: err.message
              }
              res.render('errorpage', { error });
            } else {
              res.redirect(`/addrelations/${id}`);
            }
          });
        }
      });
    }
  });
});

app.get('/addson/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'male' ORDER BY first||' '||last`;
      db.all(sql, (err, sons) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 5,
            sons: sons
          };
          res.render('addson', { data })
        }
      });
    }
  });
});

app.post('/addson', (req, res) => {
  const { id, name, gender, relationid, son } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = son;
  const person1id_2 = son;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 1;
  } else {
    relationid_2 = 2;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
});

app.get('/adddaughter/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'female' ORDER BY first||' '||last`;
      db.all(sql, (err, daughters) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 6,
            daughters: daughters
          };
          res.render('adddaughter', { data })
        }
      });
    }
  });
});

app.post('/adddaughter', (req, res) => {
  const { id, name, gender, relationid, daughter } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = daughter;
  const person1id_2 = daughter;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 1;
  } else {
    relationid_2 = 2;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
});

app.get('/addbrother/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'male' ORDER BY first||' '||last`;
      db.all(sql, (err, brothers) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 7,
            brothers: brothers
          };
          res.render('addbrother', { data })
        }
      });
    }
  });
});

app.post('/addbrother', (req, res) => {
  const { id, name, gender, relationid, brother } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = brother;
  const person1id_2 = brother;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 7;
  } else {
    relationid_2 = 8;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
});

app.get('/addsister/:id', (req, res) => {
  const id = req.params.id;
  let sql = "SELECT first||' '||last name, gender FROM persons WHERE id = ?";
  db.all(sql, id, (err, persons) => {
    if (err) {
      console.log(`Error reading database: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `SELECT id, first||' '||last name FROM persons WHERE gender = 'female' ORDER BY first||' '||last`;
      db.all(sql, (err, sisters) => {
        if (err) {
          console.log(`Error reading database: ${err.message}`);
          const error = {
            type: "Error reading from persons table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          const data = {
            id: id,
            person: persons[0].name,
            gender: persons[0].gender,
            relationid: 8,
            sisters: sisters
          };
          res.render('addsister', { data })
        }
      });
    }
  });
});

app.post('/addsister', (req, res) => {
  const { id, name, gender, relationid, sister } = req.body;
  const person1id_1 = id;
  const relationid_1 = relationid;
  const person2id_1 = sister;
  const person1id_2 = sister;
  let relationid_2 = '';
  if (gender === 'male') {
    relationid_2 = 7;
  } else {
    relationid_2 = 8;
  }
  const person2id_2 = id;
  let sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
  db.run(sql, [person1id_1, relationid_1, person2id_1], (err) => {
    if (err) {
      console.log(`Error writing database: ${err.message}`);
      const error = {
        type: "Error writing to relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      sql = `INSERT INTO relationships (person1id, relationid, person2id) values (?, ?, ?)`;
      db.run(sql, [person1id_2, relationid_2, person2id_2], (err) => {
        if (err) {
          console.log(`Error writing database: ${err.message}`);
          const error = {
            type: "Error writing to relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        } else {
          res.redirect(`/addrelations/${id}`);
        }
      });
    }
  });
});

app.get('/removefather/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 1 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 5
      } else {
        relationid = 6
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removemother/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 2 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 5
      } else {
        relationid = 6
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removewife/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 4 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 3 and person2id = ?)`;
      db.run(sql, [person2id, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removehusband/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 3 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 4 and person2id = ?)`;
      db.run(sql, [person2id, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removeson/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 5 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 1
      } else {
        relationid = 2
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removedaughter/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 6 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 1
      } else {
        relationid = 2
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removebrother/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 7 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 7
      } else {
        relationid = 8
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/removesister/:person1id/:gender/:person2id', (req, res) => {
  const person1id = parseInt(req.params.person1id, 10);
  const gender = req.params.gender;
  const person2id = parseInt(req.params.person2id, 10);
  let relationid = 0;
  let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = 8 and person2id = ?)`;
  db.run(sql, [person1id, person2id], (err) => {
    if (err) {
      console.log(`Error deleting from relationships: ${err.message}`);
      const error = {
        type: "Error deleting from relationships table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      if (gender === 'male') {
        relationid = 7
      } else {
        relationid = 8
      }
      let sql = `DELETE FROM relationships WHERE (person1id = ? and relationid = ? and person2id = ?)`;
      db.run(sql, [person2id, relationid, person1id], (err) => {
        if (err) {
          console.log(`Error deleting from relationships: ${err.message}`);
          const error = {
            type: "Error deleting from relationships table",
            details: err.message
          }
          res.render('errorpage', { error });
        }
        else {
          res.redirect(`/addrelations/${person1id}`);
        }
      });
    }
  });
});

app.get('/editperson/:id', (req, res) => {
  const sql = `SELECT * FROM persons WHERE id = ?`;
  db.get(sql, req.params.id, (err, person) => {
    if (err) {
      console.log(`Error reading from persons: ${err.message}`);
      const error = {
        type: "Error reading from persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      res.render('editperson', { person });
    }
  });
});

app.post('/editperson', (req, res) => {
  const id = parseInt(req.body.id);
  const first = req.body.first;
  const last = req.body.last;
  const gender = req.body.gender;
  const dob = req.body.dob;
  let dod = req.body.dod;
  console.log(dod);
  let is_alive = null;
  if (req.body.isalive === '') {
    is_alive = 'yes';
    dod = '';
  } else {
    is_alive = 'no';
  };
  console.log(dod);
  const sql = `UPDATE persons SET first = ?, last = ?, gender = ?, dob = ?, isalive = ?, dod = ? WHERE id = ?`;
  db.run(sql, [first, last, gender, dob, is_alive, dod, id], (err) => {
    if (err) {
      console.log(`Error writing to persons: ${err.message}`);
      const error = {
        type: "Error writing to persons table",
        details: err.message
      }
      res.render('errorpage', { error });
    } else {
      res.redirect(`/`);
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});
