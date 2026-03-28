import React from 'react';
import './FooterLink.css'

function FooterLink(props) {
    return (
        <div className='footer-link-div'>
            <a href={props.href}>{props.text}</a>
        </div>
    )

}

export default FooterLink