'use client'
import React from 'react'
import styles from "@/src/componen/header/Header.module.css"
import { gameOptions } from '@/src/const/const'
import Image from 'next/image'
import cpuIcon from '@/public/imagensvg/cpu.png'
import { useUserName } from "@/src/context/UserNameContext.js"

const Header = () => {
    const { selectedItemCompu, gameResult, isGameOver, countdown } = useUserName();

    if (!selectedItemCompu && !isGameOver) {
        return (
            <figcaption className={styles.cpuIdle}>
                {/* unoptimized: Next.js convertiria el PNG a WebP con perdida,
                    y eso emborrona los bordes duros del pixel art. Son 19KB,
                    no compensa degradarlo por ahorrar 15KB. */}
                <Image
                    src={cpuIcon}
                    alt="CPU"
                    priority
                    unoptimized
                    className={styles.cpuIcon}
                />
                <span className={`nes-text is-disabled ${styles.cpuLabel}`}>CPU</span>
            </figcaption>
        );
    }

    const imagesToRender = isGameOver
        ? gameOptions
        : selectedItemCompu
            ? [selectedItemCompu]
            : gameOptions;

    const figcaptionClass = (selectedItemCompu && !isGameOver) ? styles.selectedImageCompu : styles.figcaption;

    return (
        <figcaption className={figcaptionClass}>
            {imagesToRender.map((item) => (
                <Image
                    key={item.name}
                    alt={item.name}
                    className={`${styles.svgHand} ${styles[item.name]}`}
                    src={item.image}
                    width={72}
                    height={72}
                />
            ))}
        </figcaption>
    );
};

export default Header;
