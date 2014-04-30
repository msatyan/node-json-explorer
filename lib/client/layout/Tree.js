var d3 = require('d3-browserify')
var log = require('../log.js')
var d3Tip = require('d3-tip')(d3)

module.exports = Tree

function Tree(w, h) {
	this._w = w
	this._h = h
}

Tree.prototype.init = function(element) {

	this._tree = d3.layout.tree()	    
	    .size([this._h, this._w]);

	this._diagonal = d3.svg.diagonal()
    	.projection(this.__projection())

	this._vis = element.append('svg:svg')
		    .attr('width', this._w)
		    .attr('height', this._h)
		    .attr('transform', 'translate(20,20)');;

	this._tip = d3.tip()
	.attr('class', 'd3-tip')
	.offset([0, 0])
	.html(function(d) {
		return d.properties
	})

	this._vis.call(this._tip)
}

Tree.prototype.addNode = function (n1, n2) {
	log.debug('add %s, %s', n1.id, n2 ? n2.id : '')

	if (!this._root) {
		this._root = n1
		this._root.x0 = this._w / 2;
		this._root.y0 = this._h;
	}

	this.update(n1)
}

Tree.prototype.update = function(source) {
	var self = this
	var duration = 500;
	var diagonal = this._diagonal

	source = source || this._root

	// Compute the new tree layout.
	var nodes = this._tree.nodes(this._root).reverse();

	// Normalize for fixed-depth.
	for (var i = 0; i < nodes.length; i++)
		nodes[i].y = nodes[i].level * 180
	
	// Update the nodes…
	var node = this._vis.selectAll('g.node')
		.data(nodes, function(d) { return d.id || (d.id = ++i); });

	// Enter any new nodes at the parent's previous position.
	var nodeEnter = node.enter().append('svg:g')
		.attr('class', 'node')
		.attr('transform', function(d) { return 'translate(' + source.y0 + ',' + source.x0 + ')'; })
		.on('mouseover', this._tip.show)
      	.on('mouseout', this._tip.hide)
		.on('click', function(d) { self.__toggle(d); self.update(d); });

	nodeEnter.append('svg:circle')
		.attr('r', 1e-6)
		.style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; });

	nodeEnter.append('svg:text')
		.attr('x', function(d) { return d.children || d._children ? -10 : 10; })
		.attr('dy', '.35em')
		.attr('text-anchor', function(d) { return d.children || d._children ? 'end' : 'start'; })
		.text(function(d) { return d.key(); })
		.style('fill-opacity', 1e-6);

	// Transition nodes to their new position.
	var nodeUpdate = node.transition()
		.duration(duration)
		.attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; });

	nodeUpdate.select('circle')
		.attr('r', 4.5)
		.style('fill', function(d) { return d._children ? 'lightsteelblue' : '#fff'; });

	nodeUpdate.select('text')
		.style('fill-opacity', 1);

	// Transition exiting nodes to the parent's new position.
	var nodeExit = node.exit().transition()
		.duration(duration)
		.attr('transform', function(d) { return 'translate(' + source.y + ',' + source.x + ')'; })
		.remove();

	nodeExit.select('circle')
		.attr('r', 1e-6);

	nodeExit.select('text')
		.style('fill-opacity', 1e-6);

	// Update the links…
	var link = this._vis.selectAll('path.link')
		.data(this._tree.links(nodes), function(d) { return d.target.id; });

	// Enter any new links at the parent's previous position.
	link.enter().insert('svg:path', 'g')
		.attr('class', 'link')
		.attr('d', function(d) {
			var o = {x: source.x0, y: source.y0};
			return diagonal({source: o, target: o});
		})
		.transition()
		.duration(duration)
		.attr('d', diagonal);

	// Transition links to their new position.
	link.transition()
		.duration(duration)
		.attr('d', diagonal);

	// Transition exiting nodes to the parent's new position.
	link.exit().transition()
		.duration(duration)
		.attr('d', function(d) {
			var o = {x: source.x, y: source.y};
			return diagonal({source: o, target: o});
		})
		.remove();

	// Stash the old positions for transition.
	for (var i = 0; i < nodes.length; i++) {
		var n = nodes[i]
		n.x0 = n.x;		
		n.y0 = n.y;
	}		
}

Tree.prototype.__tick = function () {
	var self = this

	return function () {

		self._link
			.attr('x1', self.__getLinkSourceX())
			.attr('y1', self.__getLinkSourceY())
			.attr('x2', self.__getLinkTargetX())
			.attr('y2', self.__getLinkTargetY())

		self._node.attr('transform', self.__transformNode());
	}
}

Tree.prototype.__projection = function() {
	return function(d) {
		return [d.y, d.x]; 
	}
}

Tree.prototype.__toggle = function(d){

	if (d.children) {
		d._children = d.children;
		d.children = null;
	} else {
		d.children = d._children;
		d._children = null;
	}
}