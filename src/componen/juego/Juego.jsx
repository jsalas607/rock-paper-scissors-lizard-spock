'use client'
import styles from '@/src/componen/juego/Juego.module.css'
import Image from 'next/image'
import { gameOptions } from '@/src/const/const'
import { useUserName } from "@/src/context/UserNameContext.js"
import { useState, useEffect, useRef } from 'react';

const Juego = () => {
    const {
        selectedItemUser,
        setSelectedItemUser,
        generateCompuSelection,
        setSelectedItemCompu,
        gameResult,
        isGameOver,
        countdown,
        setCountdown,
    } = useUserName();

    const [isCooldownActive, setIsCooldownActive] = useState(false);
    const intervalRef = useRef(null);
    const timeoutRef = useRef(null);

    // Limpia todos los timers al desmontar el componente (ej: al abandonar)
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleImageClick = (itemName) => {
        if (isGameOver || selectedItemUser !== null || isCooldownActive) return;

        setSelectedItemUser(itemName);
        setIsCooldownActive(true);

        let count = 3;
        setCountdown(count);

        intervalRef.current = setInterval(() => {
            count--;
            setCountdown(count);

            if (count <= 0) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                setCountdown(null);
                generateCompuSelection();

                timeoutRef.current = setTimeout(() => {
                    setSelectedItemUser(null);
                    setSelectedItemCompu(null);
                    setIsCooldownActive(false);
                    timeoutRef.current = null;
                }, 2500);
            }
        }, 1000);
    };

    const imagesToRender = isGameOver
        ? gameOptions
        : selectedItemUser
            ? gameOptions.filter(item => item.name === selectedItemUser)
            : gameOptions;

    // Una mano no se puede elegir si la partida acabo, si ya elegiste o
    // si el contador esta corriendo.
    const bloqueada = isGameOver || isCooldownActive || selectedItemUser !== null;

    // Enter y Espacio son las teclas que activan un boton. Una <img> no las
    // maneja sola, hay que hacerlo a mano.
    const handleKeyDown = (e, itemName) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();   // Espacio haria scroll de la pagina
            handleImageClick(itemName);
        }
    };

    return (
        <figcaption className={`${isGameOver || !selectedItemUser ? styles.figcaption : styles.centerSingleImage}`}>
            {imagesToRender.map((item) => (
                <Image
                    key={item.name}
                    alt={item.name}
                    className={`${styles.svgHand} ${styles[item.name]} ${selectedItemUser === item.name ? styles.selectedImage : ''} ${(gameResult && selectedItemUser !== item.name) || isGameOver || isCooldownActive || selectedItemUser !== null ? styles.disabledImage : ''}`}
                    src={item.image}
                    width={72}
                    height={72}
                    role="button"
                    aria-label={`Elegir ${item.name}`}
                    aria-disabled={bloqueada}
                    tabIndex={bloqueada ? -1 : 0}
                    onClick={bloqueada ? undefined : () => handleImageClick(item.name)}
                    onKeyDown={bloqueada ? undefined : (e) => handleKeyDown(e, item.name)}
                />
            ))}
        </figcaption>
    );
};

export default Juego;
