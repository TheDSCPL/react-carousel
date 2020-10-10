import React, { useState } from 'react';
import styled from 'styled-components';
import Carousel from '../Carousel';

const HomeCarousel = styled(Carousel)`
    width: 800px;
    height: 400px;
    border: 1px solid black;
`;

export default function Index2() {
    return (
        <HomeCarousel>
            <p>A</p>
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google"/>
            <p>C</p>
            <p>D</p>
            <p>E</p>
        </HomeCarousel>
    )
}
