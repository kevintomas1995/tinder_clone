import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Auth, DataStore, Storage } from "aws-amplify";
import { S3Image } from "aws-amplify-react-native";
import { User } from "../../models/";
import * as ImagePicker from "expo-image-picker";

const ProfileScreen = (props) => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState();
  const [lookingFor, setLookingFor] = useState();
  const [newImageLocalUri, setNewImageLocalUri] = useState(null);

  // hiermit checken wir, ob der aktuelle User schon in der DB abgespeichert wurde
  // wird nur einmal initial ausgeführt
  useEffect(() => {
    const getCurrentUser = async () => {
      const authUser = await Auth.currentAuthenticatedUser();

      // dbUser ist ein Array
      const dbUsers = await DataStore.query(User, (u) =>
        u.sub("eq", authUser.attributes.sub)
      );

      // wenn kein User vorhanden ist:
      if (!dbUsers || dbUsers.length === 0) {
        console.warn("This is a new user");
        return;
      }

      // ansonsten die Infos in dbUser abspeichern
      const dbUser = dbUsers[0];
      setUser(dbUser);

      // und diese Infos zum Autoausfüllen nutzen!
      setName(dbUser.name);
      setBio(dbUser.bio);
      setGender(dbUser.gender);
      setLookingFor(dbUser.lookingFor);
    };

    getCurrentUser();
  }, []);

  // hiermit checke ich, ob alle Felder richtig ausgefüllt sind
  const isValid = () => {
    return name && bio && gender && lookingFor;
  };

  const save = async () => {
    //wenn nicht alle Felder ausgefüllt, schmeiß eine Warnung
    if (!isValid()) {
      console.warn("Not valid");
      return;
    }

    let newImage;
    if (newImageLocalUri) {
      newImage = await uploadImage();
    }

    // hier checkt man dann, ob der aktuelle User im unserem State "user" existiert bzw. ob er in der db ist
    // wenn ja, dann werden die Daten aus der DB dem aktuellen User zugeschrieben
    if (user) {
      const updatedUser = User.copyOf(user, (updated) => {
        updated.name = name;
        updated.bio = bio;
        updated.gender = gender;
        updated.lookingFor = lookingFor;
        // updated.image raus, wenn man den image picker nicht hat
        if (newImage) {
          updated.image = newImage;
        }
      });

      await DataStore.save(updatedUser);
      setNewImageLocalUri(null);

      // ansonsten wird ein neuer erstellt
    } else {
      // hier holt man sich den aktuell eingelogten user
      const authUser = await Auth.currentAuthenticatedUser();

      // speichert das in die Datenbank
      const newUser = new User({
        sub: authUser.attributes.sub,
        name,
        bio,
        gender,
        lookingFor,
        image:
          "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/zuck.jpeg",
      });

      await DataStore.save(newUser);
    }

    Alert.alert("User saved successfully!");
  };

  const signOut = async () => {
    // clear cache
    await DataStore.clear();
    Auth.signOut();
  };

  // das ist alles für den Image picker
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Sorry, we need camera roll permissions to make this work!");
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.cancelled) {
      setNewImageLocalUri(result.uri);
    }
  };

  // alles für den Image upload nach S3
  const uploadImage = async () => {
    try {
      const response = await fetch(newImageLocalUri);

      // man muss in ein blob transformieren, um es im Storage abspeichern zu können
      const blob = await response.blob();

      const urlParts = newImageLocalUri.split(".");
      const extension = urlParts[urlParts.length - 1];

      // so nur ein Foto upload pro user möglich
      // wenn mehrere möglich sein sollen --> const key = `${uuidv4()}.${extension}`; (diese Library muss dan noch installiert werden)
      const key = `${user.id}.${extension}`;

      await Storage.put(key, blob);

      return key;
    } catch (e) {
      console.log(e);
    }
    return "";
  };

  // die gleiche Logik müsste man auch bei den Swipekarten machen
  // da werden die bilder ja auch abgebildet
  // in index.js ist der entsprechende code ausgeklammert
  const renderImage = () => {
    // hier gehen wir jedes Format der Bilder durch
    // entweder Link, lokal oder S3


    if (newImageLocalUri) {
      return (
        <Image
          source={{ uri: newImageLocalUri }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
      );
    }
    if (user?.image?.startsWith("http")) {
      return (
        <Image
          source={{ uri: user?.image }}
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
      );
    }
    return (
      <S3Image
        imgKey={user?.image}
        style={{ width: 100, height: 100, borderRadius: 50 }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {props.isUserLoading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <View style={styles.container}>
          {renderImage()}
          <Pressable onPress={pickImage}>
            <Text>Pick an image</Text>
          </Pressable>

          <TextInput
            style={styles.input}
            placeholder="Name..."
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Bio..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
          />
          <TextInput
            style={styles.input}
            placeholder="Your gender..."
            // Muss großgeschrieben werden : OTHER, MALE, FEMALE....
            value={gender}
            onChangeText={setGender}
          />
          <TextInput
            style={styles.input}
            placeholder="Looking for..."
            // Muss großgeschrieben werden : OTHER, MALE, FEMALE....
            value={lookingFor}
            onChangeText={setLookingFor}
          />

          <Pressable style={styles.save} onPress={save}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>

          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    width: "100%",
    padding: 10,
    flex: 1,
  },
  container: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  input: {
    margin: 10,
    borderBottomColor: "lightgrey",
    borderBottomWidth: 1,
    width: "80%",
  },
  save: {
    backgroundColor: "lightgrey",
    alignItems: "center",
    width: "80%",
    borderRadius: 50,
    margin: 10,
  },
  saveText: {
    fontSize: 20,
    color: "white",
    padding: 10,
  },
  signOut: {
    backgroundColor: "#F76C6B",
    alignItems: "center",
    width: "80%",
    borderRadius: 50,
    margin: 10,
  },
  signOutText: {
    fontSize: 20,
    color: "white",
    padding: 10,
  },
});
