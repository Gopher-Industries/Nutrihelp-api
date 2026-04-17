import React from 'react';
import './ImageLink.css';

// Component to render an image as a clickable link
function ImageLink(props) {
    return (
        <div className='image-link-div'>
            <a href={props.href}>
                <img className="image-class" src={props.imageSrc}></img>
            </a>
        </div>
    )
}

export default ImageLink