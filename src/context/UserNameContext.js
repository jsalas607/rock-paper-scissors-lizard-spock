'use client'
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { gameOptions } from '@/src/const/const';

const UserNameContext = createContext();

const REGLAS_VICTORIA = {
    "roca": ["tijera", "lagarto"],
    "papel": ["roca", "spock"],
    "tijera": ["papel", "lagarto"],
    "lagarto": ["spock", "papel"],
    "spock": ["tijera", "roca"]
};

export const UserNameProvider = ({ children }) => {
    const [screen, setScreen] = useState('landing');
    const [inputValue, setInputValue] = useState('');
    const [totalRounds, setTotalRounds] = useState(null);
    const [selectedItemUser, setSelectedItemUser] = useState(null);
    const [selectedItemCompu, setSelectedItemCompu] = useState(null);
    const [gameResult, setGameResult] = useState(null);
    const [userWins, setUserWins] = useState(0);
    const [compuWins, setCompuWins] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Invitacion recibida por enlace: ?sala=CODIGO&de=NOMBRE
    const [codigoInvitacion, setCodigoInvitacion] = useState(null);
    const [invitadoPor, setInvitadoPor] = useState(null);

    // Se lee window.location.search y NO useSearchParams() a proposito: ese
    // hook obligaria a envolver la pagina en <Suspense> o la volveria
    // dinamica, y hoy "/" se prerenderiza como estatica.
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const cod = p.get('sala');
        if (!cod) return;

        setCodigoInvitacion(cod.toUpperCase().trim());

        // El nombre viene de la URL y cualquiera puede manipularlo: React ya
        // escapa el texto, pero se acota para que no reviente el diseno.
        const de = p.get('de');
        if (de) setInvitadoPor(de.trim().slice(0, 20));

        setScreen('invitacion');
    }, []);

    // Reset explícito al recargar la página (F5)
    useEffect(() => {
        const handleUnload = () => {
            setScreen('landing');
            setInputValue('');
            setSelectedItemUser(null);
            setSelectedItemCompu(null);
            setGameResult(null);
            setUserWins(0);
            setCompuWins(0);
            setIsGameOver(false);
            setCountdown(null);
            setTotalRounds(null);
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    const generateCompuSelection = useCallback(() => {
        const randomIndex = Math.floor(Math.random() * gameOptions.length);
        const randomCompuItem = gameOptions[randomIndex];
        setSelectedItemCompu(randomCompuItem);
        console.log("La computadora seleccionó:", randomCompuItem.name);
    }, []);

    const determinarGanador = useCallback(() => {
        if (!selectedItemUser || !selectedItemCompu) {
            setGameResult(null);
            return;
        }

        const eleccionUsuario = selectedItemUser;
        const eleccionCompu = selectedItemCompu.name;
        let currentResult = null;

        if (eleccionUsuario === eleccionCompu) {
            currentResult = "¡Empate!";
        } else if (REGLAS_VICTORIA[eleccionUsuario] && REGLAS_VICTORIA[eleccionUsuario].includes(eleccionCompu)) {
            currentResult = `¡Ganaste! ${eleccionUsuario} vence a ${eleccionCompu}`;
            setUserWins(prevWins => prevWins + 1);
        } else {
            currentResult = `¡Perdiste! ${eleccionCompu} vence a ${eleccionUsuario} `;
            setCompuWins(prevWins => prevWins + 1);
        }
        setGameResult(currentResult);
    }, [selectedItemUser, selectedItemCompu]);

    useEffect(() => {
        if (selectedItemUser && selectedItemCompu) {
            determinarGanador();
        } else {
            setGameResult(null);
        }
    }, [selectedItemUser, selectedItemCompu, determinarGanador]);


useEffect(() => {
    if (totalRounds && (userWins >= totalRounds || compuWins >= totalRounds)) {
        const timer = setTimeout(() => {
            setIsGameOver(true);
        }, 800);

        return () => clearTimeout(timer);
    }
}, [userWins, compuWins, totalRounds]);

    const resetGameButKeepInput = useCallback(() => {
        setSelectedItemUser(null);
        setSelectedItemCompu(null);
        setGameResult(null);
        setUserWins(0);
        setCompuWins(0);
        setIsGameOver(false);
        setCountdown(null);
    }, []);

   
    const resetAllGame = useCallback(() => {
        setInputValue('');
        setSelectedItemUser(null);
        setSelectedItemCompu(null);
        setGameResult(null);
        setUserWins(0);
        setCompuWins(0);
        setIsGameOver(false);
        setCountdown(null);
        setTotalRounds(null);
        setScreen('landing');
    }, []);

    const resetSelections = useCallback(() => {
        setSelectedItemUser(null);
        setSelectedItemCompu(null);
        setGameResult(null);

    }, []);

    const value = {
        inputValue,
        setInputValue,
        selectedItemUser,
        setSelectedItemUser,
        selectedItemCompu,
        setSelectedItemCompu,
        generateCompuSelection,
        gameResult,
        userWins,
        compuWins,
        resetSelections,
        determinarGanador,
        isGameOver,
        resetAllGame,
        resetGameButKeepInput,
        countdown,
        setCountdown,
        screen,
        setScreen,
        totalRounds,
        setTotalRounds,
        codigoInvitacion,
        invitadoPor
    };

    return (
        <UserNameContext.Provider value={value}>
            {children}
        </UserNameContext.Provider>
    );
};

export const useUserName = () => {
    const context = useContext(UserNameContext);
    if (!context) {
        throw new Error('useUserName must be used within a UserNameProvider');
    }
    return context;
};;