import React from 'react';
import './Footer.css'
import SeniorsFooterSection from './sections/SeniorsFooterSection'
import EatingWellFooterSection from './sections/EatingWellFooterSection'
import CommunityFooterSection from './sections/CommunityFooterSection'
import TermsAndPoliciesFooterSection from './sections/TermsAndPoliciesFooterSection'

// Footer component
function Footer(props) {
    return (
        <div className='footer-div'>
            <br></br>
            <div className='common-links-container'>
                <SeniorsFooterSection />
                <EatingWellFooterSection />
                <CommunityFooterSection />
            </div>
            <br></br>
            <br></br>
            <br></br>
            <div className='terms-and-conditions-links-container'>
                <TermsAndPoliciesFooterSection />
            </div>
            <br></br>

        </div>
    )

}

export default Footer