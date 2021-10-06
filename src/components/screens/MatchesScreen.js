import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import users from "../../../data/users";
import { DataStore, Auth } from "aws-amplify";
import { Match, User } from "../../models";

const MatchesScreen = () => {
  const [matches, setMatches] = useState([]);
  const [me, setMe] = useState(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await Auth.currentAuthenticatedUser();

      // dbUser ist ein Array
      const dbUsers = await DataStore.query(User, (u) =>
        u.sub("eq", user.attributes.sub)
      );

      // wenn kein User vorhanden ist:
      if (!dbUsers || dbUsers.length === 0) {
        return;
      }

      // den authentifizierten User abspeichern
      setMe(dbUsers[0]);
    };
    getCurrentUser();
  }, []);

  // aktuelle Matches kriegen
  useEffect(() => {
    if (!me) {
      return;
    }
    const fetchMatches = async () => {
      const result = await DataStore.query(Match, (m) =>
        m
          .isMatch("eq", true)
          .or((m) => m.User1ID("eq", me.id).User2ID("eq", me.id))
      );
      setMatches(result);
    };
    fetchMatches();
  }, [me]);

  // das hier um live auf Veränderungen zu warten
  useEffect(() => {
    const subscription = DataStore.observe(Match).subscribe((msg) => {
      console.log(msg.model, msg.opType, msg.element);
      if (msg.opType === "UPDATE") {
        const newMatch = msg.element;
        if (
          newMatch.isMatch &&
          (newMatch.User1 === me.id || newMatch.User2ID === me.id)
        ) {
          console.log("there is a new match waiting");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={{ fontWeight: "bold", fontSize: 24, color: "#F63A6E" }}>
          New Matches
        </Text>
        <View style={styles.users}>
          {matches.map((match) => {
            const matchUser =
              match.User1ID === me.id ? match.User2 : match.User1;
            // das hier ist um die Matches darzustellen, die sich "live" ergeben
            if (!match.User1 || !match.User2) {
              return (
                <View style={styles.user} key={match.id}>
                  <Image source={{}} style={styles.image} />
                  <Text style={styles.name}>New Match</Text>
                </View>
              );
            }
            // und das hier für die normalen, die man am anfang lädt
            return (
              <View style={styles.user} key={match.id}>
                <Image source={{ uri: matchUser.image }} style={styles.image} />
                <Text style={styles.name}>{matchUser.name}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MatchesScreen;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    padding: 10,
    flex: 1,
  },
  container: {
    padding: 10,
  },
  users: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  user: {
    width: 100,
    height: 100,
    margin: 10,
    borderRadius: 50,

    padding: 3,
    borderWidth: 3,
    borderColor: "#F63A6E",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },
  name: {
    textAlign: "center",
    marginTop: "9%",
  },
});
