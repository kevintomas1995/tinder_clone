import React, { useState, useEffect } from "react";
import { StyleSheet, View, SafeAreaView, Pressable } from "react-native";
import HomeScreen from "./src/components/screens/HomeScreen";
import MatchesScreen from "./src/components/screens/MatchesScreen";
import ProfileScreen from "./src/components/screens/ProfileScreen";
import Fontisto from "react-native-vector-icons/Fontisto";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Amplify, { Hub, DataStore, Auth } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react-native";
import config from "./src/aws-exports";
import {User} from "./src/models";

Amplify.configure({
  ...config,
  Analytics: {
    disabled: true,
  },
});

const App = () => {
  const [activeScreen, setActiveScreen] = useState("HOME");
  const [isUserLoading, setIsUserLoading] = useState(true);

  const color = "#b5b5b5";
  const activeColor = "#F76C6B";

  // die Daten werden hier eigentlich nicht gebraucht, aber
  // ansonten wird hubData.payload nicht getriggert 
  // in dem useeffect mit Hub.listen
  useEffect(() => {
    const getCurrentUser = async () => {
      const authUser = await Auth.currentAuthenticatedUser();

      // dbUser ist ein Array
      const dbUsers = await DataStore.query(User, (u) =>
        u.sub("eq", authUser.attributes.sub)
      );

    };

    getCurrentUser();
  }, []);


  // hier hören wir auf datastore events
  // konkret: ob das user model geladen wurde
  useEffect(() => {
    const listener = Hub.listen("datastore", async (hubData) => {
      const { event, data } = hubData.payload;
      if (event === "modelSynced" && data?.model?.name === "User") {
        console.log("User Model has finished syncing");
        setIsUserLoading(false);
      }
    });

    return () => listener();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.pageContainer}>
        <View style={styles.topNavigation}>
          <Pressable onPress={() => setActiveScreen("HOME")}>
            <Fontisto
              name="tinder"
              size={30}
              color={activeScreen === "HOME" ? activeColor : color}
            />
          </Pressable>

          <Pressable onPress={() => setActiveScreen("CHAT")}>
            <Ionicons
              name="ios-chatbubbles"
              size={30}
              color={activeScreen === "CHAT" ? activeColor : color}
            />
          </Pressable>

          <Pressable onPress={() => setActiveScreen("PROFILE")}>
            <FontAwesome
              name="user"
              size={30}
              color={activeScreen === "PROFILE" ? activeColor : color}
            />
          </Pressable>

          <MaterialCommunityIcons
            name="star-four-points"
            size={30}
            color={color}
          />
        </View>

        {activeScreen === "HOME" && (
          <HomeScreen isUserLoading={isUserLoading} />
        )}
        {activeScreen === "CHAT" && <MatchesScreen />}
        {activeScreen === "PROFILE" && (
          <ProfileScreen isUserLoading={isUserLoading} />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pageContainer: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  topNavigation: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    padding: 10,
  },
});

export default withAuthenticator(App);
