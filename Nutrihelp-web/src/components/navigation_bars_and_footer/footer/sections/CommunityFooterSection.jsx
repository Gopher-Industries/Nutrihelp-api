import React from 'react';
import './CommunityFooterSection.css';
import SubHeading from '../../../general_components/headings/SubHeading';
import ImageLink from '../../../general_components/links/ImageLink';
import iconFacebook from './../../../../images/icon-facebook.png'
import iconTwitter from './../../../../images/icon-twitter.png'
import iconInstagram from './../../../../images/icon-instagram.png'

//Section in the Footer containing Social media image links
function CommunityFooterSection(props) {
    return (
        <div className='links-for-social-media-div'>
            <SubHeading
                text="Community"
            />

            <div className='links-container'>
                <ImageLink
                    imageSrc={iconFacebook}
                    href="https://www.facebook.com/"
                />
                <ImageLink
                    imageSrc={iconTwitter}
                    href="https://twitter.com/"
                />
                <ImageLink
                    imageSrc={iconInstagram}
                    href="https://www.instagram.com/"
                />

            </div>
        </div>
    )

}

export default CommunityFooterSection