const typedef=`#graphql
type user{
id:ID!
name:String!
email:String!
}
input userinput{
name:String!
email:String!
}

type query{
users:[user]
user(id:ID!):user
}
 type mutation{
createUser(input:userinput):user
}



`