import React, { FC } from 'react';
import styled from 'styled-components';
import Carousel, { CarouselProps } from '../Carousel';

const HomeCarousel: FC<CarouselProps> = styled(Carousel)`
    width: 800px;
    height: 400px;
    border: 1px solid black;
`;

export default function Index() {
    return (
        <HomeCarousel enableTouchHandling={true} nextSlideDragSnapTouchTolerance={5} nextSlideDragSnapMouseTolerance={50}>
            <p>A</p>
            <img src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png" alt="Google"/>
            <p>C</p>
            <p>D</p>
            <p>E</p>
        </HomeCarousel>
    )
}
