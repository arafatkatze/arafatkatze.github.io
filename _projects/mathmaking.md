---
layout: page
title: Mathematics of Love
description: 
importance: 1
category: art
---
Love is a divine endeavor and perhaps some would say the same thing about mathematics, maybe they're right. In this post I want to reflect on the mathematics behind the in-person matchmaking experience from [Book Bear Express](https://www.avabear.xyz/), organized by Ava. To explore the emotional and philosophical reasons behind this experiment, [read another post here](https://arafatkatze.github.io/projects/love_happens/).

[BookBear Express](https://www.avabear.xyz/) has been one of my favorite blogs for many years. I have read Ava's work for four years and the ideas there have helped me tremendously in how I meet people with grace and love.
Ava wanted to organize a matchmaking event where you find the readers of [BookBear Express](https://www.avabear.xyz/) and then try to pair them with each other. Hopefully some of them get married, and I get invited to a wedding.

<div class="col-sm mt-3 mt-md-0 mx-auto" style="max-width: 520px;">
  {% include figure.html
     path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330692/Screenshot_2025-10-12_at_9.44.44_PM_i5uvtk.png"
     title="example image"
     class="img-fluid rounded z-depth-1"
     max_width="50px" %}
</div>

To make this event more fun, our idea was to gather a lot of data from people. We asked everyone 26 questions to figure out who they were, what their preferences were, and then do a very comprehensive analysis of figuring out the kind of person they are, what kind of books/blogs they read and generally try to model their personality in the least number of questions.
Based on the results we invite a lot of people to the event and then give them a pair wise matching between each other. In the event, we had mainly people looking for romantic relationships and then a few people were looking for platonic relationships. Let's analyze some data to figure out how that works.
Lets start with some simple facts like gender distribution



<div class="col-sm mt-3 mt-md-0" >
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330865/2_imqlyj.png" title="example image" class="img-fluid " %}
</div>
    

This was a complete surprise for me. Knowing that the Bay Area is HEAVILY Male dominated, having such a high volume of women was very surprising for me, although I suppose this may have something to do with the fact that people here are readers of BookBear Express. Overall, this was very delightful because we were able to pair more people in a graceful way and made people feel welcome.

 

<div class="col-sm mt-3 mt-md-0"  style="max-width: 450px;">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330865/3_cqhuwy.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>


This part wasn't exactly a surprise because it would make sense that most people in a matchmaking event are looking for a romantic partner. It's just how it works.




<div class="col-sm mt-3 mt-md-0" style="max-width: 480px;">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330864/4_dvp0uu.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>

This was somewhat surprising given the Bay Area's typically diverse representation of sexual orientations. However, our data was limited by technical constraints. We had to restrict the form to single-choice selections because Typeform's multi-selection export format makes data analysis extremely difficult(Ava wanted to offer multiple selections but I had to force things this way as typeform parsing gets totally messed up).
This unfortunately skewed our results. I later learned many bisexual attendees selected single options rather than accurately representing their orientation. I sincerely apologize for this limitation, it's clearly an area I need to improve. I appreciate the feedback and we are committed to finding better solutions for future events.

<div class="col-sm mt-3 mt-md-0" style="max-width: 450px;">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330865/9_ltgt18.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>




The age distribution was slightly skewed in some ways but not as much as I would have hoped. Overall I am actually happy with this.

<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330867/additional_insights_yomdhu.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>




We evaluate people on different kinds of preferences that they have. This is how that looks roughly(There’s many other preferences that are hidden on purpose here).
The most surprising part of this was the children's preference, so many people actually wanted to have children. I was hoping that this will probably be lower given that this is the bay area.
The least surprising part of this is the religious affiliation. There are only roughly 30% of people who are actively religious.
The Algorithms


<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330866/6_da763x.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>




How did we do it? The first part of the algorithm was just like having a hard filtration of different kinds of people based on their hard criteria. You have to take care that gender, children, and religious filters and other non-negotiable filters are handled carefully. It looks something like this.
<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330865/7_zxsmyf.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>



The second part of the algorithm was the weighted matching. So you wanted to be able to take different parameters, apply different features on them, and then get an aggregate of them. This would also involve calling LLM and figuring out more information about a person through the links they had mentioned about themselves, through their preferences of books and stuff, and other information. So that would give us a more comprehensive idea of their preferences around different dimensions. And then at the end, if the net score was above a certain threshold, we would just consider those two people matched.
<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330866/8_w8hmor.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
</div>


This was the whole algorithm.
The consequences of the algorithm
This algorithm led to everyone getting a matching score, which would define how close of a match two people are. If they're not much of a match, then we just let them not be a match. This score is for people who have already passed the hard filters.
<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330865/9_ltgt18.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>


Total → 730 Pairs of Matches
In terms of algorithmic complexity, this was fine so far.
If we look at the score distribution of the people who matched, it turns out, given the algorithm, most people who matched were only 60-65% compatible. On a philosophical level, what this means is that, it was basically impossible to find your near perfect opposite pair. I think that what this broadly means is that, don't assume you know what you're looking for. Who knows what magical thing, you might find in another person as long as you're matching on most things.

### The Final Match Making

The craziest part of the whole endeavor was that while it is true that there were 700+ pairs of matches between people, we couldn't overwhelm people with all of their matches. The idea was to give every one three matches:
Two people were their best matches
One person was their match that was the least compatible
We were not going to tell them which was which, There were many people who had multiple matches. Some had up to 8, 6, or 7 matches, but we couldn't overwhelm them with all their matches, so we had to restrict the number of matches people had because we didn't want to overwhelm them with the choice of having to talk to too many people.

<div class="col-sm mt-3 mt-md-0" >
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760330866/10_mgqoew.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>




## Formal Mathematics to find best pairs of matches

<div class="col-sm mt-3 mt-md-0">
    {% include figure.html path="https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1760331447/Screenshot_2025-10-12_at_9.57.20_PM_tlb3rb.png" title="example image" class="img-fluid rounded z-depth-1" %}
</div>


This was the hardest part of matching people. The algorithm would often lead to some people with three matches, but often a lot of people with just two matches and then some people with one match. This led to a few issues that had to be manually fixed for every person. Because every person is special and I think I spent a lot of time on making sure that everyone got three matches. In the future, we want to do a situation where we give people more matches so that they have more people that they could pair with. In the end we had 60 people with 3 matches, 27 with 2 matches and the rest with 1 match.
I'm strongly considering putting a $500 bounty on this matchmaking problem. I have no hopes that someone would solve an NP-hard problem on $500, but I do think that people can come up with a better solution than I did if I incentivize them with some money. I still have all the code for this, and the code is very modular, so this problem can be extended, improved, and iterated upon. My current solution led to a lot of manual scrambling and just actually talking to people and trying to set them up.

Overall, I think that with some math, data analysis, and due diligence, I think that we were able to pair a lot of people together and handle the logistical aspect of things. I have many other feelings. I have many thoughts about this event, about the philosophy behind this, but I will keep that in a separate post.

