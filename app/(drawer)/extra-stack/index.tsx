import { StyleSheet, Text, View } from 'react-native';

export default function ExtraScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is an extra screen</Text>
      <Text>It is inside a separate stack navigator.</Text>
      <Text>You can navigate back using the back arrow.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});