import { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

type ProductImageProps = {
    imageUrl?: string;
    style?: StyleProp<ViewStyle>;
};

export function ProductImage({ imageUrl, style }: ProductImageProps) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <View style={[styles.frame, style]}>
            {imageUrl && !imageFailed ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="contain"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <View style={styles.placeholder}>
                    <View style={styles.bottle}>
                        <View style={styles.bottleCap} />
                        <View style={styles.bottleNeck} />
                        <View style={styles.bottleShoulder} />
                        <View style={styles.bottleBody} />
                    </View>
                    <Text style={styles.placeholderText}>Kein Bild verfügbar</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    frame: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    placeholderText: {
        color: '#5D6C64',
        fontSize: 14,
    },
    bottle: {
        width: 40,
        alignItems: 'center',
    },
    bottleCap: {
        width: 16,
        height: 8,
        borderRadius: 2,
        backgroundColor: '#8A9A90',
    },
    bottleNeck: {
        width: 16,
        height: 10,
        backgroundColor: '#8A9A90',
    },
    bottleShoulder: {
        width: 40,
        height: 16,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        backgroundColor: '#8A9A90',
    },
    bottleBody: {
        width: 40,
        height: 64,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        backgroundColor: '#8A9A90',
    },
});
