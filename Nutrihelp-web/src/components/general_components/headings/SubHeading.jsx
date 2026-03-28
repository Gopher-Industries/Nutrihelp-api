import React from 'react'
import './SubHeading.css'

function SubHeading(props) {
    return (
        <div className='sub-heading-div'>
            <h1>{props.text}</h1>
        </div>
    )

}
export default SubHeading