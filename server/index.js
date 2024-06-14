const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.exyylxe.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const classesCollection = client.db("Summer-camp").collection("classes");
    const usersCollection = client.db("Summer-camp").collection("users");
    const selectedClassCollection = client
      .db("Summer-camp")
      .collection("selectedClass");
    const paymentCollection = client.db("Summer-camp").collection("payments");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // Add users to the Database
    app.post("/adduser", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Post selected class to the database
    app.post("/selectClass", async (req, res) => {
      const selectClass = req.body;
      const result = await selectedClassCollection.insertOne(selectClass);
      res.send(result);
    });

    // Get selected class from the database by email
    app.get("/selectedClass", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.send([]);

      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      res.send({
        insertResult,
        deleteResult,
        updateResult,
        updateSeatsResult,
        updateInstructorResult,
      });
    });

    // Instructor Routes
    app.post("/addClass", verifyJWT, verifyInstructorJWT, async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    //Get instructor classes from the database by email using JWT
    app.get(
      "/instructorClasses",
      verifyJWT,
      verifyInstructorJWT,
      async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const result = await classesCollection.find(query).toArray();
        res.send(result);
      }
    );

    // Get all users
    app.get("/users", verifyJWT, verifyAdminJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Change user name
    app.put("/makeAdmin/:id", verifyJWT, verifyAdminJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(query, update);
      res.send(result);
    });

    // Change user
    app.put(
      "/makeInstructor/:id",
      verifyJWT,
      verifyAdminJWT,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const update = { $set: { role: "instructor" } };
        const result = await usersCollection.updateOne(query, update);
        res.send(result);
      }
    );
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("EduCamp-server is running");
});

app.listen(port, () => {
  console.log(`EduCamp-server running at:${port}`);
});
