import React from 'react';
import FooterLink from '../FooterLink';
import SubHeading from '../../../general_components/headings/SubHeading';

// "For Clients" section of the Footer
function EatingWellFooterSection(props) {
    return (
        <div className='links-for-clients-div'>
            <SubHeading
                text="Eating Well"
            />
            <FooterLink
                text="Search Recipes"
                href=""
            />
            <FooterLink
                text="Groceries Shopping"
                href=""
            />
            <FooterLink
                text="Nutrition 101"
                href=""
            />
        </div>
    )

}

export default EatingWellFooterSection