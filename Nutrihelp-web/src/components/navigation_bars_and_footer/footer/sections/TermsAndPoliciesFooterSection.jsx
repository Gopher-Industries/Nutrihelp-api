import React from 'react';
import './TermsAndPoliciesFooterSection.css';
import FooterLink from '../FooterLink';
import SubHeading from '../../../general_components/headings/SubHeading';

// "DEVLink" section of the Footer
function TermsAndPoliciesFooterSection(props) {
    return (
        <div className='links-for-terms-and-conditions-div'>
            <SubHeading
                text="Terms and Policies"
            />

            <div className='links-container'>
                <FooterLink
                    text="Privacy Poicy"
                    href=""
                />
                <FooterLink
                    text="Terms and Conditions"
                    href=""
                />
                <FooterLink
                    text="Code of Conduct"
                    href=""
                />
            </div>

        </div>
    )

}

export default TermsAndPoliciesFooterSection