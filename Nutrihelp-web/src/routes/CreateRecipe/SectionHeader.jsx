import { Header } from 'semantic-ui-react'
import React from 'react'

// Header of sections in the Create Recipe page
const SectionHeader = (props) => (
    <Header as='h3'>
        {props.text}
    </Header>
)

export default SectionHeader