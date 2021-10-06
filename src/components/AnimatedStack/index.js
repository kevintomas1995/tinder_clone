import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  useWindowDimensions,
  Text,
  Pressable,
} from "react-native";

// das nutzt man, um den bspw. den touches zu folgen
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
  useDerivedValue,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import Nope from "../../../assets/nope.png";
import Like from "../../../assets/LIKE.png";

const ROTATION = 60;
const SWIPE_VELOCITY = 800;

export default function AnimatedStack(props) {
  const { data, renderItem, onSwipeRight, onSwipeLeft, setCurrentUser } = props;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(currentIndex + 1);
  const currentProfile = data[currentIndex];
  const nextProfile = data[nextIndex];
  const { width: screenWidth } = useWindowDimensions();
  const hiddenTranslateX = 2 * screenWidth;

  // darauf basieren die Animationen
  // die werte können von -width (ganz links) über 0 (mitte) bis width (ganz rechts) gehen
  // für rotate bedeutet das, dass die werte von -60deg über 0deg  bis 60deg gehen soll
  const translateX = useSharedValue(0);

  // interpolate bringt das translateX und die Rotation zusammen
  const rotate = useDerivedValue(
    () =>
      interpolate(translateX.value, [0, hiddenTranslateX], [0, ROTATION]) +
      "deg"
  );

  // animatedStyles werden in den Animated Dingern als styles genutzt
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: translateX.value,
      },
      {
        rotate: rotate.value,
      },
    ],
  }));

  const nextCardStyle = useAnimatedStyle(() => ({
    // wenn die erste Karte weg ist, dann soll die folgende normal groß sein
    // ansonsten soll sie kleiner sein (hier 80% der ursprünglichen Größe)
    // das gleich mit der opactity
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-hiddenTranslateX, 0, hiddenTranslateX],
          [1, 0.8, 1]
        ),
      },
    ],
    opacity: interpolate(
      translateX.value,
      [-hiddenTranslateX, 0, hiddenTranslateX],
      [1, 0.6, 1]
    ),
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, hiddenTranslateX / 5], [0, 1]),
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -hiddenTranslateX / 5], [0, 1]),
  }));

  // definiert, was bei bestimmten gesten passieren soll
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
    },
    onActive: (event, context) => {
      // translateX wird die aktuelle position zugeschrieben
      // dadurch können wir mit der Maus die Karte herumschieben
      translateX.value = context.startX + event.translationX;
    },
    // velocity beziet sich auf die Geschwindigkeit, mit der man swiped
    // wenn es langsam ist, dann soll sie zurück in die Mitte springen (translate.valueX = 0)
    onEnd: (event) => {
      if (Math.abs(event.velocityX) < SWIPE_VELOCITY) {
        translateX.value = withSpring(0);
        return;
      }

      translateX.value = withSpring(
        event.velocityX > 0 ? hiddenTranslateX : -hiddenTranslateX,
        {},
        // das muss man machen, damit das nicht im UI-Thread läuft, sondern im JS Thread
        // und das muss man hier machen, um zu warten, bis die Animation fertig ist
        // anstatt es außerhalb des withSprings zu machen
        () => runOnJS(setCurrentIndex)(currentIndex + 1)
      );
      const onSwipe = event.velocityX > 0 ? onSwipeRight : onSwipeLeft;
      onSwipe && runOnJS(onSwipe)();
    },
  });

  // jedes mal, wenn der currentIndex sich ändert, soll das hier passieren
  useEffect(() => {
    // die Karte soll wieder zu sehen sein
    translateX.value = 0;
    setNextIndex(currentIndex + 1);
  }, [currentIndex, translateX]);

  useEffect(() => {
    setCurrentUser(currentProfile);
  }, [currentProfile, setCurrentUser]);

  const helperFunction = () => {
    console.log(nextIndex)
    translateX.value = 0;
    setCurrentIndex(nextIndex);
    setCurrentUser(currentProfile);
    console.log(nextIndex)
  };

  return (
    <View style={styles.root}>
      {/* nur wenn ein nächstes Profil existiert, soll er das rendern */}
      {nextProfile && (
        <View style={styles.nextCardContainer}>
          <Animated.View style={[styles.animatedCard, nextCardStyle]}>
            {renderItem({ item: nextProfile })}
          </Animated.View>
        </View>
      )}

      {currentProfile ? (
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.animatedCard, cardStyle]}>
            <Animated.Image
              source={Like}
              style={[styles.like, { left: 10 }, likeStyle]}
              resizeMode="contain"
            />
            <Animated.Image
              source={Nope}
              style={[styles.like, { right: 10 }, nopeStyle]}
              resizeMode="contain"
            />
            {renderItem({ item: currentProfile })}
          </Animated.View>
        </PanGestureHandler>
      ) : (
        <View>
          <Text>No more users</Text>
        </View>
      )}
      <Pressable onPress={helperFunction} style={{margin: 10}}>
        <Text>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    width: "100%",
  },
  animatedCard: {
    width: "90%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
  },
  nextCardContainer: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: "center",
    alignItems: "center",
  },
  like: {
    width: 150,
    height: 150,
    position: "absolute",
    top: 50,
    zIndex: 1,
    elevation: 1,
  },
});
