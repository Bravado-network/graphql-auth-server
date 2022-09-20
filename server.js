const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const { buildSchema } = require("graphql");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const NOT_SO_SECRET_JWT_KEY = "shhhhh";

const fakeDb = new Map();

const schema = buildSchema(`
  type User {
    id: ID
    email: String
  }
  
  type Token {
    token: String!
  }
  
  input AuthInput {
    email: String
    password: String
  }
  
  type Mutation {
    signUp(input: AuthInput): Token
    signIn(input: AuthInput): Token
  }
  
  type Query {
    currentUser: User
  }
`);

const rootValue = {
  signUp({ input }) {
    if (!input.email) throw new Error("Email is required");
    if (!input.password) throw new Error("Password is required");
    if (fakeDb.get(input.email)) throw new Error("User already exists");

    const newUser = {
      id: fakeDb.size + 1,
      email: input.email,
    };
    const token = jwt.sign({ email: newUser.email }, NOT_SO_SECRET_JWT_KEY);

    fakeDb.set(input.email, { ...newUser, ...input });

    return {
      token,
    };
  },
  signIn({ input }) {
    if (!input.email) throw new Error("Email is required");
    if (!input.password) throw new Error("Password is required");

    const user = fakeDb.get(input.email);

    if (!user) throw new Error("User not found");
    if (input.password !== user.password) throw new Error("Incorrect password");

    const token = jwt.sign(
      { id: user.id, email: user.email },
      NOT_SO_SECRET_JWT_KEY
    );
    return { token };
  },
  currentUser(args, request) {
    const token = request.headers.authorization.split(" ").pop();
    if (!token) return {};
    const userData = jwt.verify(token, NOT_SO_SECRET_JWT_KEY);
    const user = fakeDb.get(userData.email);

    if (!user) return {};

    return user;
  },
};

const app = express();
app.use(cors());
app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue,
    graphiql: true,
  })
);
app.listen(4000);
console.log("Running a GraphQL API server at localhost:4000/graphql");
