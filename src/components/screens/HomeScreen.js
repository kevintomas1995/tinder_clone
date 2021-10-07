import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Card from "../TinderCard";
import { Auth, DataStore } from "aws-amplify";
import { User, Match } from "../../models";
import AnimatedStack from "../AnimatedStack/index";
import Entypo from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";


// was hier noch fehlt für meine App ist, dass User, die nach links geswiped werden, abgespeichert werden
// das braucht man, um diese dann nicht noch einmal anzuzeigen

export default function HomeScreen(props) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [matchesIds, setMatchesIds] = useState(null);
  const [me, setMe] = useState(null);

  // hiermit speichern wir den authentifizierten User in me ab
  // wird nur einmal initial ausgeführt
  useEffect(() => {
    if (props.isUserLoading) {
      return;
    }

    const getCurrentUser = async () => {
      const authUser = await Auth.currentAuthenticatedUser();

      // dbUser ist ein Array
      const dbUsers = await DataStore.query(User, (u) =>
        u.sub("eq", authUser.attributes.sub)
      );

      // wenn kein User vorhanden ist:
      if (!dbUsers || dbUsers.length === 0) {
        return;
      }

      // den authentifizierten User abspeichern
      setMe(dbUsers[0]);
    };

    getCurrentUser();
  }, [props.isUserLoading]);

  

  // aktuelle Matches kriegen, damit man die nicht mehr anzeigt
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
      
      // jedoch nur die matches, in denen der aktuelle User beteiligt ist
      setMatchesIds(result.map(match => 
        match.User1ID === me.id ? match.User2ID : match.User1ID,
      ));
    };
    fetchMatches();
  }, [me]);



  // hier ziehen wir uns die users aus der db
  useEffect(() => {
    if (props.isUserLoading || !me || matchesIds === null) {
      return;
    }

    const fetchUsers = async () => {
      // hier filtern wir nach dem Geschlecht der User bzw. was man bei looking for angegeben hat
      let datastoreUsers = await DataStore.query(User, (user) =>
        user.gender("eq", me.lookingFor)
      );
      // nur die User, die noch nicht gemached wurden wollen wir haben/anzeigen
      datastoreUsers = datastoreUsers.filter(u => !matchesIds.includes(u.id))
      setUsers(datastoreUsers);
    };
    fetchUsers();
  }, [props.isUserLoading, me, matchesIds]);



  const onSwipeLeft = (user) => {
    console.warn("left");
    if (!currentUser || !me) {
      return;
    }
  };



  const onSwipeRight = async () => {
    console.warn("right");
    if (!currentUser || !me) {
      return;
    }

    const myMatches = await DataStore.query(Match, (match) =>
      match.User1ID("eq", me.id).User2ID("eq", currentUser.id)
    );

    if (myMatches.length > 0) {
      console.log("You already swiped right to this user");
      return;
    }

    const hisMatches = await DataStore.query(Match, (match) =>
      match.User1ID("eq", currentUser.id).User2ID("eq", me.id)
    );

    if (hisMatches.length > 0) {
      console.log("this is a new match");
      const hisMatch = hisMatches[0];
      DataStore.save(
        Match.copyOf(hisMatch, (updated) => (updated.isMatch = true))
      );
      return;
    }

    console.log("sending a match request");

    DataStore.save(
      new Match({
        User1ID: me.id,
        User2ID: currentUser.id,
        isMatch: false,
      })
    );
  };

  return (
    <View style={styles.pageContainer}>
      <AnimatedStack
        data={users}
        renderItem={({ item }) => <Card user={item} />}
        onSwipeLeft={onSwipeLeft}
        onSwipeRight={onSwipeRight}
        setCurrentUser={setCurrentUser}
      />
      <View style={styles.icons}>
        <FontAwesome name="undo" size={30} color="#FBD88B" />
        <Entypo name="star" size={30} color="#F76C6B" onPress={onSwipeRight} />
        <FontAwesome name="star" size={30} color="#3AB4CC" />
        <FontAwesome name="heart" size={30} color="#4FCC94" />
        <Ionicons name="flash" size={30} color="#A65CD2" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    width: "100%",
  },
  icons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 10,
  },
});
