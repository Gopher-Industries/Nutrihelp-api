import React from 'react';
import FooterLink from '../FooterLink';
import SubHeading from '../../../general_components/headings/SubHeading';

// "For Dev" section of the Footer
function SeniorsFooterSection(props) {
    return (
        <div className='links-for-developers-div'>
            <SubHeading
                text="Seniors"
            />

            <FooterLink
                text="How to use NutriHelp"
                href=""
            />
            <FooterLink
                text="How to set up your profile"
                href=""
            />
            <FooterLink
                text="Find Help"
                href=""
            />

        </div>
    )

}

export default SeniorsFooterSection